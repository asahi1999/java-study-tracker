// 画面のテスト用の JavaRunner（設計書 14章。jsdom では Worker と Wasm が動かない）。
// 結果は呼ぶ側が決める。呼ばれた RunJob は calls に残る
import type { JavaRunner, LiveChunk, RunJob, RunnerStatus, RunResult } from './JavaRunner.ts';

export type FakeRunnerOptions = {
  status?: RunnerStatus;
  /** RunJob ごとの結果。既定は「全部の松明がともる」 */
  respond?: (job: RunJob) => RunResult | Promise<RunResult>;
  /** 実行中に流す出力 */
  live?: LiveChunk[];
};

export type FakeRunner = JavaRunner & {
  calls: RunJob[];
  prepareCount: number;
  cancelCount: number;
  /** 状態を変えて、subscribe した側に知らせる */
  setStatus(status: RunnerStatus, progress?: number): void;
};

export function passedResult(job: RunJob, output = ''): RunResult {
  const cases = job.stages.flatMap((s) =>
    s.cases.map((c, i) => ({
      stage: s.n,
      index: i + 1,
      name: c.name,
      ok: true,
      expected: null,
      actual: c.expected ?? output,
      error: null,
    })),
  );
  const total = cases.length;
  return {
    kind: 'judged',
    stages: job.stages.map((s) => ({
      stage: s.n,
      passed: s.cases.length,
      total: s.cases.length,
      cases: cases.filter((c) => c.stage === s.n),
      checks: [],
    })),
    passed: total,
    total,
    asIs: {
      stage: 0,
      index: 0,
      name: 'そのまま実行',
      ok: null,
      expected: null,
      actual: output,
      error: null,
    },
    displayOutput: output,
    stderr: '',
    ms: 1,
  };
}

export function createFakeRunner(options: FakeRunnerOptions = {}): FakeRunner {
  let status: RunnerStatus = options.status ?? 'ready';
  const listeners = new Set<(s: RunnerStatus, progress?: number) => void>();
  const runner: FakeRunner = {
    calls: [],
    prepareCount: 0,
    cancelCount: 0,
    get status() {
      return status;
    },
    setStatus(next, progress) {
      status = next;
      for (const l of listeners) l(next, progress);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async prepare() {
      runner.prepareCount++;
    },
    cancel() {
      runner.cancelCount++;
    },
    async run(job, onLive) {
      runner.calls.push(job);
      if (status === 'unsupported') return { kind: 'unsupported' };
      for (const chunk of options.live ?? []) onLive?.(chunk);
      return options.respond ? options.respond(job) : passedResult(job);
    },
  };
  return runner;
}
