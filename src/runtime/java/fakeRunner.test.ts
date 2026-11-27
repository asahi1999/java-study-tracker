import { describe, expect, it } from 'vitest';

import { createFakeRunner, passedResult } from './fakeRunner.ts';
import { isCleared, type RunJob } from './JavaRunner.ts';

const job: RunJob = {
  stepId: 'ch00.a',
  rev: 1,
  source: 'compact',
  learnerFiles: [{ path: 'Main.java', content: '' }],
  givenFiles: [],
  testsJava: null,
  stdin: '',
  stages: [{ n: 1, cases: [{ name: 'a', stdin: '', expected: 'A\n' }] }],
  timeoutMs: 3000,
};

describe('createFakeRunner', () => {
  it('既定は全部の松明がともる。呼ばれた RunJob を残す', async () => {
    const runner = createFakeRunner();
    const result = await runner.run(job);
    expect(isCleared(result)).toBe(true);
    expect(runner.calls).toEqual([job]);
  });

  it('結果と流す出力を決められる', async () => {
    const live: string[] = [];
    const runner = createFakeRunner({
      respond: () => ({ kind: 'timeout', partialOutput: '', doneStages: [], timeoutMs: 3000 }),
      live: [{ stream: 'stdout', text: 'x' }],
    });
    expect((await runner.run(job, (c) => live.push(c.text))).kind).toBe('timeout');
    expect(live).toEqual(['x']);
  });

  it('状態を変えると subscribe した側に知らせる。unsupported なら実行しない', async () => {
    const runner = createFakeRunner({ status: 'idle' });
    const seen: string[] = [];
    runner.subscribe((s) => seen.push(s));
    runner.setStatus('unsupported');
    expect(seen).toEqual(['unsupported']);
    expect(await runner.run(job)).toEqual({ kind: 'unsupported' });
    await runner.prepare();
    runner.cancel();
    expect([runner.prepareCount, runner.cancelCount]).toEqual([1, 1]);
  });
});

describe('isCleared', () => {
  it('total = 0 は合格にしない', () => {
    expect(isCleared(passedResult({ ...job, stages: [] }))).toBe(false);
  });
});
