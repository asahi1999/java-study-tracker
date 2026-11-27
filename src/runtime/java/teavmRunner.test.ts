import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CompileIn, CompileOut, RunIn, RunOut } from './core/messages.ts';
import type { RunJob } from './JavaRunner.ts';
import { createTeavmRunner, type WorkerLike } from './teavmRunner.ts';

const RS = '\u001e';
const line = (obj: object) => `\n${RS}@@jq ${JSON.stringify(obj)}\n`;

/** 判定まで終わったときの標準エラー（ハーネスの出力の形） */
function judgedStderr(passed: number, total: number) {
  return [
    line({ t: 'hello', v: 2, step: 'ch00.a', rev: 1, source: 'compact' }),
    line({
      t: 'case',
      stage: 0,
      i: 0,
      name: 'そのまま実行',
      ok: null,
      actual: 'hi\n',
      error: null,
    }),
    line({
      t: 'case',
      stage: 1,
      i: 1,
      name: 'ケース',
      ok: passed === total,
      actual: 'hi\n',
      error: null,
    }),
    line({ t: 'stage', stage: 1, passed, total }),
    line({ t: 'done', step: 'ch00.a', rev: 1, passed, total }),
  ].join('');
}

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  private readonly handle: (w: FakeWorker, message: unknown) => void;
  constructor(handle: (w: FakeWorker, message: unknown) => void) {
    this.handle = handle;
  }
  postMessage(message: unknown) {
    this.posted.push(message);
    queueMicrotask(() => this.handle(this, message));
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: CompileOut | RunOut) {
    if (!this.terminated) this.onmessage?.({ data } as MessageEvent);
  }
}

type Behavior = {
  compile?: (msg: Extract<CompileIn, { type: 'compile' }>, w: FakeWorker, count: number) => void;
  run?: (msg: RunIn, w: FakeWorker) => void;
};

function setup(
  behavior: Behavior = {},
  extra: { compileTimeoutMs?: number; recycleAfter?: number } = {},
) {
  const compileWorkers: FakeWorker[] = [];
  const runWorkers: FakeWorker[] = [];
  let compiles = 0;
  const runner = createTeavmRunner({
    baseUrl: '/java-study-tracker/',
    harness: { files: [] },
    loadManifest: async () => ({
      teavm: { version: 'x', dir: 'x', sizes: { 'compiler.wasm': 100 } },
    }),
    waitForServiceWorker: async () => {},
    compileTimeoutMs: extra.compileTimeoutMs,
    recycleAfter: extra.recycleAfter,
    createCompileWorker: () => {
      const w = new FakeWorker((self, raw) => {
        const msg = raw as CompileIn;
        if (msg.type === 'init') {
          self.emit({ type: 'progress', loaded: 50, total: 100 });
          self.emit({ type: 'ready', initMs: 1 });
          return;
        }
        compiles++;
        if (behavior.compile) behavior.compile(msg, self, compiles);
        else
          self.emit({
            type: 'compiled',
            id: msg.id,
            wasm: new ArrayBuffer(8),
            ms: { javac: 1, teavm: 1 },
          });
      });
      compileWorkers.push(w);
      return w;
    },
    createRunWorker: () => {
      const w = new FakeWorker((self, raw) => {
        const msg = raw as RunIn;
        if (behavior.run) behavior.run(msg, self);
        else {
          self.emit({ type: 'started', id: msg.id });
          self.emit({ type: 'stdout', id: msg.id, text: 'hi\n' });
          self.emit({ type: 'stderr', id: msg.id, text: judgedStderr(1, 1) });
          self.emit({ type: 'exit', id: msg.id, code: 0 });
        }
      });
      runWorkers.push(w);
      return w;
    },
  });
  return { runner, compileWorkers, runWorkers, compiles: () => compiles };
}

const job: RunJob = {
  stepId: 'ch00.a',
  rev: 1,
  source: 'compact',
  learnerFiles: [
    { path: 'Main.java', content: 'void main() {\n    System.out.println("hi");\n}\n' },
  ],
  givenFiles: [],
  testsJava: null,
  stdin: '',
  stages: [{ n: 1, cases: [{ name: 'ケース', stdin: '', expected: 'hi\n' }] }],
  timeoutMs: 3000,
};

afterEach(() => {
  vi.useRealTimers();
});

describe('createTeavmRunner', () => {
  it('prepare で取得を始め、進み具合を知らせて ready になる', async () => {
    const { runner, compileWorkers } = setup();
    const seen: [string, number | undefined][] = [];
    runner.subscribe((s, p) => seen.push([s, p]));
    await runner.prepare();
    expect(runner.status).toBe('ready');
    expect(seen).toContainEqual(['downloading', 0.5]);
    const init = compileWorkers[0].posted[0] as Extract<CompileIn, { type: 'init' }>;
    expect(init.sizes).toEqual({ 'compiler.wasm': 100 });
    expect(init.assets.compilerWasm).toMatch(
      /\/java-study-tracker\/java\/teavm-javac\/0\.17\.0-pg4\/compiler\.wasm$/,
    );
  });

  it('コンパイル → 実行 → 判定の結果を返し、出力を流す', async () => {
    const { runner, runWorkers } = setup();
    const live: string[] = [];
    const result = await runner.run(job, (c) => live.push(`${c.stream}:${c.text.slice(0, 2)}`));
    expect(result).toMatchObject({ kind: 'judged', passed: 1, total: 1, displayOutput: 'hi\n' });
    expect(live[0]).toBe('stdout:hi');
    expect(runWorkers[0].terminated).toBe(true);
  });

  it('事前の検査: class で包んだコードは実行しない', async () => {
    const { runner, compiles } = setup();
    const result = await runner.run({
      ...job,
      learnerFiles: [
        {
          path: 'Main.java',
          content: 'public class Main {\n  public static void main(String[] a) {}\n}',
        },
      ],
    });
    expect(result).toMatchObject({ kind: 'precheck', line: 1 });
    expect(compiles()).toBe(0);
  });

  it('コンパイルエラーは学習者の位置に直して返す', async () => {
    const { runner } = setup({
      compile: (msg, w) =>
        w.emit({
          type: 'compile-error',
          id: msg.id,
          diagnostics: [
            { file: 'Main.java', line: 2, column: 30, severity: 'error', message: "';' expected" },
          ],
        }),
    });
    const result = await runner.run(job);
    expect(result).toEqual({
      kind: 'compile-error',
      diagnostics: [
        {
          file: 'Main.java',
          line: 2,
          column: 30,
          severity: 'error',
          message: "';' expected",
          origin: 'learner',
        },
      ],
    });
  });

  it('時間切れは started を受けてから数え、run.worker を止める', async () => {
    vi.useFakeTimers();
    let started: (() => void) | null = null;
    const { runner, runWorkers } = setup({
      run: (msg, w) => {
        started = () => w.emit({ type: 'started', id: msg.id });
        w.emit({ type: 'stdout', id: msg.id, text: 'loop\n' });
      },
    });
    const promise = runner.run({ ...job, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(5000); // started の前は数えない
    expect(runWorkers[0].terminated).toBe(false);
    started!();
    await vi.advanceTimersByTimeAsync(999);
    expect(runWorkers[0].terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const result = await promise;
    expect(result).toMatchObject({ kind: 'timeout', partialOutput: 'loop\n', timeoutMs: 1000 });
    expect(runWorkers[0].terminated).toBe(true);
  });

  it('出力の上限（limit）で止める', async () => {
    const { runner, runWorkers } = setup({
      run: (msg, w) => {
        w.emit({ type: 'started', id: msg.id });
        w.emit({ type: 'limit', id: msg.id, reason: 'output' });
      },
    });
    expect((await runner.run(job)).kind).toBe('output-limit');
    expect(runWorkers[0].terminated).toBe(true);
  });

  it('コンパイラ内部のエラーは compile.worker を作り直して1回だけやり直す', async () => {
    const { runner, compileWorkers } = setup({
      compile: (msg, w, count) => {
        if (count === 1) w.emit({ type: 'internal-error', id: msg.id, message: 'RuntimeError' });
        else
          w.emit({
            type: 'compiled',
            id: msg.id,
            wasm: new ArrayBuffer(8),
            ms: { javac: 1, teavm: 1 },
          });
      },
    });
    expect((await runner.run(job)).kind).toBe('judged');
    expect(compileWorkers).toHaveLength(2);
    expect(compileWorkers[0].terminated).toBe(true);
  });

  it('2回続けて内部のエラーなら internal-error', async () => {
    const { runner } = setup({
      compile: (msg, w) => w.emit({ type: 'internal-error', id: msg.id, message: 'RuntimeError' }),
    });
    expect(await runner.run(job)).toEqual({ kind: 'internal-error', message: 'RuntimeError' });
  });

  it('コンパイルが15秒で終わらなければ compile.worker を作り直す', async () => {
    vi.useFakeTimers();
    const { runner, compileWorkers } = setup({ compile: () => {} }, { compileTimeoutMs: 15_000 });
    const promise = runner.run(job);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await promise).toMatchObject({ kind: 'internal-error' });
    expect(compileWorkers[0].terminated).toBe(true);
  });

  it('決まった回数ごとに compile.worker を作り直す', async () => {
    const { runner, compileWorkers } = setup({}, { recycleAfter: 2 });
    await runner.run(job);
    await runner.run(job);
    expect(compileWorkers).toHaveLength(1);
    await runner.run(job);
    expect(compileWorkers).toHaveLength(2);
  });

  it('実行中に次の run が来たら、前のものを止めて cancelled にする', async () => {
    let calls = 0;
    const { runner, runWorkers } = setup({
      run: (msg, w) => {
        calls++;
        w.emit({ type: 'started', id: msg.id });
        if (calls > 1) w.emit({ type: 'exit', id: msg.id, code: 0 });
      },
    });
    const first = runner.run(job);
    await vi.waitFor(() => expect(runWorkers).toHaveLength(1));
    const second = runner.run(job);
    expect(await first).toEqual({ kind: 'cancelled' });
    expect(runWorkers[0].terminated).toBe(true);
    expect((await second).kind).toBe('exited-early');
  });

  it('cancel で実行中のものを止める', async () => {
    const { runner, runWorkers } = setup({
      run: (msg, w) => w.emit({ type: 'started', id: msg.id }),
    });
    const promise = runner.run(job);
    await vi.waitFor(() => expect(runWorkers).toHaveLength(1));
    runner.cancel();
    expect(await promise).toEqual({ kind: 'cancelled' });
  });

  it('準備に失敗したら failed になり、run は internal-error', async () => {
    const runner = createTeavmRunner({
      baseUrl: '/',
      harness: { files: [] },
      loadManifest: async () => null,
      waitForServiceWorker: async () => {},
      createCompileWorker: () =>
        new FakeWorker((w) => w.emit({ type: 'init-failed', message: 'WebAssembly.CompileError' })),
    });
    await runner.prepare();
    expect(runner.status).toBe('failed');
    expect(await runner.run(job)).toMatchObject({ kind: 'internal-error' });
  });
});
