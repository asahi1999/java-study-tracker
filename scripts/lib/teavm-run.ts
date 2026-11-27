// teavm-javac で1回コンパイルして動かす子プロセス（content-verify が問題・解答ごとに起動する）。
// Node で同じ compiler.wasm を何度も使うと落ちることがある（research）ので、1プロセス1回にする。
// 標準入力: TeavmJob の JSON。標準出力: TeavmJobResult の JSON（1行）
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SourceFile } from '../../src/domain/java/types.ts';
import { CompilerInternalError } from '../../src/runtime/java/core/compile.ts';
import type { RawDiagnostic } from '../../src/runtime/java/core/messages.ts';
import type { RawRun } from '../../src/runtime/java/core/result.ts';
import { compileWithTeavm, runWasmInWorker } from './teavm-node.ts';

export type TeavmJob = { files: SourceFile[]; timeoutMs: number; mainClass?: string };

export type TeavmJobResult =
  | { kind: 'run'; run: RawRun; compileMs: number }
  | { kind: 'compile-error'; diagnostics: RawDiagnostic[] }
  | { kind: 'internal-error'; message: string };

const SELF = fileURLToPath(import.meta.url);

/** 子プロセスで1回動かす。コンパイラ内部のエラーは1回だけやり直す（設計書 6-9） */
export async function runTeavmIsolated(job: TeavmJob, retries = 1): Promise<TeavmJobResult> {
  let result = await spawnOnce(job);
  for (let i = 0; i < retries && result.kind === 'internal-error'; i++)
    result = await spawnOnce(job);
  return result;
}

function spawnOnce(job: TeavmJob): Promise<TeavmJobResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SELF], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (b: Buffer) => out.push(b));
    child.stderr.on('data', (b: Buffer) => err.push(b));
    const hard = setTimeout(() => child.kill('SIGKILL'), job.timeoutMs + 120_000);
    child.on('close', (code) => {
      clearTimeout(hard);
      const text = Buffer.concat(out).toString('utf8').trim();
      try {
        resolve(JSON.parse(text.slice(text.lastIndexOf('\n') + 1)) as TeavmJobResult);
      } catch {
        const stderr = Buffer.concat(err).toString('utf8').slice(0, 1000);
        resolve({
          kind: 'internal-error',
          message: `teavm-run が終了コード ${code} で終わった: ${stderr}`,
        });
      }
    });
    child.stdin.end(JSON.stringify(job));
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const job = JSON.parse(await readStdin()) as TeavmJob;
  let result: TeavmJobResult;
  try {
    const t0 = performance.now();
    const compiled = await compileWithTeavm(job.files, job.mainClass ?? 'JqRun');
    const compileMs = performance.now() - t0;
    if (!compiled.ok) {
      result = { kind: 'compile-error', diagnostics: compiled.diagnostics };
    } else {
      result = { kind: 'run', run: await runWasmInWorker(compiled.wasm, job.timeoutMs), compileMs };
    }
  } catch (e) {
    const message =
      e instanceof CompilerInternalError ? e.message : String((e as Error)?.stack ?? e);
    result = { kind: 'internal-error', message };
  }
  process.stdout.write(`${JSON.stringify(result)}\n`, () => process.exit(0));
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) void main();
