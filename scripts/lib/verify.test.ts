import { describe, expect, it } from 'vitest';

import type { ErrorEntry } from '../../src/content/schema.ts';
import type { RunResult } from '../../src/runtime/java/JavaRunner.ts';
import {
  checkAllPass,
  checkExpectation,
  compareOutputs,
  findDefaultToString,
  mapPool,
} from './verify.ts';

const errors = [
  {
    id: 'semicolon-expected',
    match: { javacEn: ["^';' expected$"], javacJa: ["^';'がありません$"] },
  },
] as unknown as ErrorEntry[];

function judged(
  passed: number,
  total: number,
  extra: Partial<Extract<RunResult, { kind: 'judged' }>> = {},
): RunResult {
  return {
    kind: 'judged',
    stages: [
      {
        stage: 1,
        passed,
        total,
        cases: Array.from({ length: total }, (_, i) => ({
          stage: 1,
          index: i + 1,
          name: `c${i + 1}`,
          ok: i < passed,
          expected: null,
          actual: `out${i + 1}`,
          error: null,
        })),
        checks: [],
      },
    ],
    passed,
    total,
    asIs: {
      stage: 0,
      index: 0,
      name: 'そのまま実行',
      ok: null,
      expected: null,
      actual: 'as-is',
      error: null,
    },
    displayOutput: 'as-is',
    stderr: '',
    ms: 1,
    ...extra,
  };
}

const compileError = (message: string): RunResult => ({
  kind: 'compile-error',
  diagnostics: [
    { file: 'Main.java', line: 2, column: 5, severity: 'error', message, origin: 'learner' },
  ],
});

describe('checkAllPass', () => {
  it('全部ともれば null、total = 0 や失敗は理由', () => {
    expect(checkAllPass(judged(2, 2))).toBeNull();
    expect(checkAllPass(judged(0, 0))).toMatch(/0件/);
    expect(checkAllPass(judged(1, 2))).toMatch(/1\/2/);
    expect(
      checkAllPass({ kind: 'timeout', partialOutput: '', doneStages: [], timeoutMs: 1 }),
    ).toMatch(/時間切れ/);
  });
});

describe('checkExpectation', () => {
  it('test: 動いて、値の不一致で1つ以上落ちる', () => {
    expect(checkExpectation({ kind: 'test' }, judged(1, 2), errors)).toBeNull();
    expect(checkExpectation({ kind: 'test' }, judged(2, 2), errors)).toMatch(
      /全部の松明がともった/,
    );
    expect(checkExpectation({ kind: 'test' }, judged(0, 0), errors)).toMatch(/0件/);
    expect(checkExpectation({ kind: 'test' }, compileError("';' expected"), errors)).toMatch(
      /コンパイルエラー/,
    );
  });

  it('test: 失敗がすべて例外なら合わない', () => {
    const r = judged(0, 1);
    if (r.kind === 'judged')
      r.stages[0].cases[0].error = {
        type: 'java.lang.ArithmeticException',
        line: 1,
        file: 'Main.java',
        message: null,
      };
    expect(checkExpectation({ kind: 'test' }, r, errors)).toMatch(/すべて例外/);
    expect(
      checkExpectation({ kind: 'exception', type: 'java.lang.ArithmeticException' }, r, errors),
    ).toBeNull();
  });

  it('exception: crash の型でも合う', () => {
    const crash: RunResult = {
      kind: 'crash',
      error: { type: 'java.lang.StackOverflowError', line: null, file: null, message: 'x' },
      partialOutput: '',
    };
    expect(
      checkExpectation({ kind: 'exception', type: 'java.lang.StackOverflowError' }, crash, errors),
    ).toBeNull();
    expect(
      checkExpectation({ kind: 'exception', type: 'java.lang.ArithmeticException' }, crash, errors),
    ).toMatch(/起きない/);
  });

  it('compile: 図鑑 ID があれば文言も見る（英・日）', () => {
    expect(checkExpectation({ kind: 'compile', dex: null }, compileError('x'), errors)).toBeNull();
    expect(
      checkExpectation(
        { kind: 'compile', dex: 'semicolon-expected' },
        compileError("';' expected"),
        errors,
      ),
    ).toBeNull();
    expect(
      checkExpectation(
        { kind: 'compile', dex: 'semicolon-expected' },
        compileError("';'がありません"),
        errors,
        'ja',
      ),
    ).toBeNull();
    expect(
      checkExpectation(
        { kind: 'compile', dex: 'semicolon-expected' },
        compileError('unclosed string literal'),
        errors,
      ),
    ).toMatch(/当たらない/);
    expect(checkExpectation({ kind: 'compile', dex: null }, judged(0, 1), errors)).toMatch(
      /compile と宣言/,
    );
  });

  it('timeout', () => {
    expect(
      checkExpectation(
        { kind: 'timeout' },
        { kind: 'timeout', partialOutput: '', doneStages: [], timeoutMs: 1 },
        errors,
      ),
    ).toBeNull();
    expect(checkExpectation({ kind: 'timeout' }, judged(0, 1), errors)).toMatch(/timeout と宣言/);
  });
});

describe('compareOutputs・findDefaultToString', () => {
  it('ケースごとの出力の違いを見つける', () => {
    expect(compareOutputs(judged(1, 1), judged(1, 1))).toBeNull();
    const other = judged(1, 1);
    if (other.kind === 'judged') other.stages[0].cases[0].actual = 'ちがう';
    expect(compareOutputs(judged(1, 1), other)).toMatch(/ケース1「c1」/);
  });

  it('既定の toString に見える文字列', () => {
    const r = judged(1, 1);
    if (r.kind === 'judged' && r.asIs) r.asIs.actual = 'Hero@1b6d3586\n';
    expect(findDefaultToString(r)).toMatch(/Hero@1b6d3586/);
    expect(findDefaultToString(judged(1, 1))).toBeNull();
  });
});

describe('mapPool', () => {
  it('同時に limit 個までで、順番どおりの結果を返す', async () => {
    let running = 0;
    let max = 0;
    const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      max = Math.max(max, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(max).toBe(2);
  });
});
