// compile.worker（常駐。設計書 4-2）: teavm-javac のファイルを取得して読み込み、javac と TeaVM で app.wasm を作る
import { type CompileLibs, compileSources, toArrayBuffer } from './core/compile.ts';
import type { AssetUrls, CompileIn, CompileOut } from './core/messages.ts';
import type { TeavmCompilerModule, TeavmRuntimeModule } from './core/teavmApi.ts';

type WorkerScope = {
  postMessage(message: CompileOut, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<CompileIn>) => void) | null;
};
const scope = self as unknown as WorkerScope;
const post = (m: CompileOut, transfer: Transferable[] = []) => scope.postMessage(m, transfer);

let ready: Promise<{ module: TeavmCompilerModule; libs: CompileLibs }> | null = null;

/** 取得しながら進み具合を送る（大きさは manifest.json の値。gzip の Content-Length に頼らない。4-10） */
async function fetchBytes(url: string, onBytes: (n: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} を取得できない（${res.status}）`);
  if (!res.body) {
    const buf = await res.arrayBuffer();
    onBytes(buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    onBytes(value.byteLength);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

function fileName(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1);
}

async function init(assets: AssetUrls, sizes: Record<string, number>) {
  const t0 = performance.now();
  const targets = [assets.compilerWasm, assets.compileClasslib, assets.runtimeClasslib];
  const total = targets.reduce((sum, url) => sum + (sizes[fileName(url)] ?? 0), 0);
  let loaded = 0;
  let lastSent = 0;
  const onBytes = (n: number) => {
    loaded += n;
    const now = performance.now();
    if (now - lastSent > 100) {
      lastSent = now;
      post({ type: 'progress', loaded: Math.min(loaded, total || loaded), total: total || loaded });
    }
  };
  const [runtime, compilerWasm, sdk, classlib] = await Promise.all([
    import(/* @vite-ignore */ assets.runtimeJs) as Promise<TeavmRuntimeModule>,
    fetchBytes(assets.compilerWasm, onBytes),
    fetchBytes(assets.compileClasslib, onBytes),
    fetchBytes(assets.runtimeClasslib, onBytes),
  ]);
  post({ type: 'progress', loaded: total || loaded, total: total || loaded });
  // ArrayBuffer を渡す（MIME に頼らない。research の推奨）
  const module = await runtime.load<TeavmCompilerModule>(compilerWasm);
  const libs: CompileLibs = {
    sdk: new Int8Array(sdk),
    classlib: new Int8Array(classlib),
    shimClasses: null,
  };
  post({ type: 'ready', initMs: performance.now() - t0 });
  return { module, libs };
}

scope.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    ready ??= init(msg.assets, msg.sizes);
    ready.catch((e: unknown) =>
      post({ type: 'init-failed', message: String((e as Error)?.message ?? e) }),
    );
    return;
  }
  void (async () => {
    try {
      if (!ready) throw new Error('init の前に compile が来た');
      const { module, libs } = await ready;
      const r = await compileSources(module, libs, msg.files, msg.mainClass);
      if (r.ok) {
        const wasm = toArrayBuffer(r.wasm);
        post({ type: 'compiled', id: msg.id, wasm, ms: { javac: r.javacMs, teavm: r.teavmMs } }, [
          wasm,
        ]);
      } else {
        post({ type: 'compile-error', id: msg.id, diagnostics: r.diagnostics });
      }
    } catch (e) {
      // コンパイラ内部のエラー（Wasm の RuntimeError など）。メインスレッドが Worker を作り直して1回やり直す
      post({ type: 'internal-error', id: msg.id, message: String((e as Error)?.stack ?? e) });
    }
  })();
};
