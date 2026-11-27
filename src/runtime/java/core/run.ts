// teavm が作った app.wasm を読み込んで main を呼ぶ（run.worker と、Node の Worker スレッドが使う）。
// 終わりは teavm の onExit だけで知らせる。main() が戻っただけでは終わりにしない
// （Thread.sleep などで途中で JS に戻ることがあるため。設計書 4-3）。

import type { CrashKind } from './messages.ts';
import { createOutputBuffer, type OutputBufferOptions, type Stream } from './output.ts';
import type { TeavmApp, TeavmLoad } from './teavmApi.ts';

export type RunSink = {
  started(): void;
  output(stream: Stream, text: string): void;
  exit(code: number): void;
  limit(): void;
  crash(kind: CrashKind, message: string): void;
};

export type RunAppOptions = {
  deobfuscatorPath?: string;
  /** Node では teavm が onExit ではなく process.exit を呼ぶので、そこから終わりを知らせる口を渡す */
  bindExit?: (reportExit: (code: number) => void) => void;
  buffer?: Partial<Omit<OutputBufferOptions, 'onFlush' | 'onLimit'>>;
};

export type RunHandle = {
  /** 例外（main の外で起きたもの）を crash として送る */
  reportError(error: unknown): void;
  /** process.exit などで外から終わりを知らせる（Node 用） */
  reportExit(code: number): void;
};

export function classifyError(error: unknown): { kind: CrashKind; message: string } {
  const e = error as { name?: unknown; message?: unknown } | null;
  const name = typeof e?.name === 'string' ? e.name : '';
  const message = typeof e?.message === 'string' ? e.message : String(error);
  if (name === 'RangeError') return { kind: 'stack-overflow', message };
  if (/out of memory|allocation|memory access out of bounds/i.test(message)) {
    return { kind: 'out-of-memory', message };
  }
  return { kind: 'unknown', message: name ? `${name}: ${message}` : message };
}

class OutputLimitStop extends Error {
  constructor() {
    super('output limit');
    this.name = 'OutputLimitStop';
  }
}

export async function runApp(
  load: TeavmLoad,
  wasm: ArrayBuffer | Int8Array | Uint8Array,
  sink: RunSink,
  options: RunAppOptions = {},
): Promise<RunHandle> {
  let ended = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const finish = () => {
    ended = true;
    if (timer !== null) clearInterval(timer);
  };
  const buffer = createOutputBuffer({
    ...options.buffer,
    onFlush: (stream, text) => sink.output(stream, text),
    onLimit: () => {
      if (ended) return;
      finish();
      sink.limit();
    },
  });
  const handle: RunHandle = {
    reportExit(code) {
      if (ended) return;
      buffer.flush();
      finish();
      sink.exit(code);
    },
    reportError(error) {
      if (ended) return;
      const name = (error as { name?: unknown } | null)?.name;
      if (name === 'TeaVMExitError' || error instanceof OutputLimitStop) return;
      buffer.flush();
      finish();
      const { kind, message } = classifyError(error);
      sink.crash(kind, message);
    },
  };
  options.bindExit?.((code) => handle.reportExit(code));
  const put = (stream: Stream, code: number) => {
    // 上限を超えたら、例外で Wasm の実行を止める（ブラウザでは、メインスレッドも Worker を止める）
    if (!buffer.put(stream, code)) throw new OutputLimitStop();
  };
  const app = await load<TeavmApp>(wasm, {
    stackDeobfuscator: options.deobfuscatorPath
      ? { enabled: true, path: options.deobfuscatorPath }
      : { enabled: false },
    onExit: (code) => handle.reportExit(code),
    installImports(imports) {
      imports.teavmConsole.putcharStdout = (code) => put('stdout', code);
      imports.teavmConsole.putcharStderr = (code) => put('stderr', code);
    },
  });
  sink.started();
  // main が途中で JS に戻ったあと（Thread.sleep など）の出力も送れるように、時間でも送る
  timer = setInterval(() => buffer.flush(), 50);
  try {
    app.exports.main([]);
    buffer.flush();
  } catch (error) {
    handle.reportError(error);
  }
  return handle;
}
