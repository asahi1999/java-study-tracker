// Node で teavm-javac を動かす（content-verify と、本物の teavm を使うテスト）。
// コンパイルはこのスレッドで、実行は Worker スレッドで行う（時間切れで terminate できるように。
// また teavm は Node では System.exit で process.exit を呼ぶので、Worker スレッドだけを終わらせる）。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { SourceFile } from '../../src/domain/java/types.ts';
import { TEAVM_FILES } from '../../src/runtime/java/assets.ts';
import { type CompileOutcome, compileSources } from '../../src/runtime/java/core/compile.ts';
import type { RunOut } from '../../src/runtime/java/core/messages.ts';
import type { RawRun } from '../../src/runtime/java/core/result.ts';
import type {
  TeavmCompilerModule,
  TeavmRuntimeModule,
} from '../../src/runtime/java/core/teavmApi.ts';
import { TEAVM_ASSET_DIR } from './paths.ts';

export function teavmAssetPath(key: keyof typeof TEAVM_FILES, dir = TEAVM_ASSET_DIR): string {
  return path.join(dir, TEAVM_FILES[key]);
}

async function loadRuntime(dir: string): Promise<TeavmRuntimeModule> {
  return (await import(pathToFileURL(teavmAssetPath('runtimeJs', dir)).href)) as TeavmRuntimeModule;
}

/** teavm-javac でコンパイルする（呼ぶたびに compiler.wasm を読み込み直す） */
export async function compileWithTeavm(
  files: SourceFile[],
  mainClass = 'JqRun',
  dir = TEAVM_ASSET_DIR,
): Promise<CompileOutcome> {
  const runtime = await loadRuntime(dir);
  const module = await runtime.load<TeavmCompilerModule>(
    readFileSync(teavmAssetPath('compilerWasm', dir)),
  );
  return compileSources(
    module,
    {
      sdk: new Int8Array(readFileSync(teavmAssetPath('compileClasslib', dir))),
      classlib: new Int8Array(readFileSync(teavmAssetPath('runtimeClasslib', dir))),
      shimClasses: null,
    },
    files,
    mainClass,
  );
}

/**
 * app.wasm を Worker スレッドで動かす。時間切れは started を受けてから数える（設計書 4-4 と同じ）。
 * hardLimitMs は、started が来ないまま止まったときの上限。
 */
export function runWasmInWorker(
  wasm: Int8Array,
  timeoutMs: number,
  dir = TEAVM_ASSET_DIR,
  hardLimitMs = 60_000,
): Promise<RawRun> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./teavm-node-worker.ts', import.meta.url), {
      workerData: {
        runtimeJs: pathToFileURL(teavmAssetPath('runtimeJs', dir)).href,
        deobfuscator: teavmAssetPath('deobfuscator', dir),
      },
    });
    let stdout = '';
    let stderr = '';
    let startedAt = 0;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const hard = setTimeout(() => finish({ kind: 'timeout' }), hardLimitMs);
    const finish = (end: RawRun['end']) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      clearTimeout(hard);
      const ms = startedAt ? performance.now() - startedAt : 0;
      void worker.terminate();
      resolve({ stdout, stderr, end, ms });
    };
    worker.on('message', (m: RunOut) => {
      switch (m.type) {
        case 'started':
          startedAt = performance.now();
          timer = setTimeout(() => finish({ kind: 'timeout' }), timeoutMs);
          break;
        case 'stdout':
          stdout += m.text;
          break;
        case 'stderr':
          stderr += m.text;
          break;
        case 'exit':
          finish({ kind: 'exit', code: m.code });
          break;
        case 'limit':
          finish({ kind: 'limit' });
          break;
        case 'crash':
          finish({ kind: 'crash', crash: m.kind, message: m.message });
          break;
      }
    });
    worker.on('error', (e) => finish({ kind: 'crash', crash: 'unknown', message: String(e) }));
    worker.on('exit', (code) => finish({ kind: 'exit', code }));
    const buf = new Uint8Array(wasm.byteLength);
    buf.set(new Uint8Array(wasm.buffer, wasm.byteOffset, wasm.byteLength));
    worker.postMessage(buf.buffer, [buf.buffer]);
  });
}
