import { describe, expect, it, vi } from 'vitest';

import { classifyError, runApp, type RunSink } from './run.ts';
import type { TeavmConsoleImports, TeavmLoad, TeavmLoadOptions } from './teavmApi.ts';

/** teavm の load の偽物。main で「出力して終了する」などの動きを書く */
function fakeLoad(
  main: (io: TeavmConsoleImports['teavmConsole'], options: TeavmLoadOptions) => void,
): TeavmLoad {
  return (async (_wasm: unknown, options?: TeavmLoadOptions) => {
    const imports = {
      teavmConsole: {
        putcharStdout: () => {},
        putcharStderr: () => {},
      } as TeavmConsoleImports['teavmConsole'],
    };
    options?.installImports?.(imports);
    return { exports: { main: () => main(imports.teavmConsole, options ?? {}) } };
  }) as TeavmLoad;
}

function sink() {
  const events: string[] = [];
  const s: RunSink = {
    started: () => events.push('started'),
    output: (stream, text) => events.push(`${stream}:${text}`),
    exit: (code) => events.push(`exit:${code}`),
    limit: () => events.push('limit'),
    crash: (kind) => events.push(`crash:${kind}`),
  };
  return { s, events };
}

const write = (put: (c: number) => void, text: string) => {
  for (let i = 0; i < text.length; i++) put(text.charCodeAt(i));
};

describe('runApp', () => {
  it('started → 出力 → exit の順に知らせる', async () => {
    const { s, events } = sink();
    await runApp(
      fakeLoad((io, options) => {
        write(io.putcharStdout, 'hi\n');
        options.onExit?.(0);
        throw Object.assign(new Error('exit'), { name: 'TeaVMExitError' });
      }),
      new ArrayBuffer(0),
      s,
    );
    expect(events).toEqual(['started', 'stdout:hi\n', 'exit:0']);
  });

  it('main が例外（RangeError）で止まったら crash', async () => {
    const { s, events } = sink();
    await runApp(
      fakeLoad(() => {
        throw new RangeError('Maximum call stack size exceeded');
      }),
      new ArrayBuffer(0),
      s,
    );
    expect(events).toEqual(['started', 'crash:stack-overflow']);
  });

  it('出力の上限を超えたら limit を知らせて実行を止める', async () => {
    const { s, events } = sink();
    const after = vi.fn();
    await runApp(
      fakeLoad((io) => {
        for (let i = 0; i < 5000; i++) write(io.putcharStdout, 'x\n');
        after();
      }),
      new ArrayBuffer(0),
      s,
    );
    expect(after).not.toHaveBeenCalled();
    expect(events.at(-1)).toBe('limit');
    expect(events.filter((e) => e === 'limit')).toHaveLength(1);
  });

  it('Node では bindExit の口から終わりを知らせる', async () => {
    const { s, events } = sink();
    let report: ((code: number) => void) | null = null;
    await runApp(
      fakeLoad(() => report?.(3)),
      new ArrayBuffer(0),
      s,
      { bindExit: (r) => (report = r) },
    );
    expect(events).toEqual(['started', 'exit:3']);
  });
});

describe('classifyError', () => {
  it('種類を見分ける', () => {
    expect(classifyError(new RangeError('x')).kind).toBe('stack-overflow');
    expect(classifyError(new Error('out of memory')).kind).toBe('out-of-memory');
    expect(classifyError(new TypeError('y'))).toEqual({ kind: 'unknown', message: 'TypeError: y' });
  });
});
