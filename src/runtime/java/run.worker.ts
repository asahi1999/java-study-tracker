// run.worker（実行ごとに新規。設計書 4-2）: app.wasm を読み込んで main を呼び、出力をまとめて送る。
// 時間切れ・出力の上限では、メインスレッドがこの Worker を terminate() する
import type { RunIn, RunOut } from './core/messages.ts';
import { runApp } from './core/run.ts';
import type { TeavmRuntimeModule } from './core/teavmApi.ts';

type WorkerScope = {
  postMessage(message: RunOut): void;
  onmessage: ((event: MessageEvent<RunIn>) => void) | null;
  addEventListener(type: 'error' | 'unhandledrejection', listener: (event: Event) => void): void;
};
const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const msg = event.data;
  const id = msg.id;
  const post = (m: RunOut) => scope.postMessage(m);
  void (async () => {
    try {
      const runtime = (await import(/* @vite-ignore */ msg.runtimeJs)) as TeavmRuntimeModule;
      const handle = await runApp(
        runtime.load,
        msg.wasm,
        {
          started: () => post({ type: 'started', id }),
          output: (stream, text) => post({ type: stream, id, text }),
          exit: (code) => post({ type: 'exit', id, code }),
          limit: () => post({ type: 'limit', id, reason: 'output' }),
          crash: (kind, message) => post({ type: 'crash', id, kind, message }),
        },
        { deobfuscatorPath: msg.deobfuscator },
      );
      // main が JS に戻ったあと（Thread.sleep など）の例外
      scope.addEventListener('error', (e) => handle.reportError((e as ErrorEvent).error ?? e));
      scope.addEventListener('unhandledrejection', (e) =>
        handle.reportError((e as PromiseRejectionEvent).reason),
      );
    } catch (e) {
      post({ type: 'crash', id, kind: 'unknown', message: String((e as Error)?.message ?? e) });
    }
  })();
};
