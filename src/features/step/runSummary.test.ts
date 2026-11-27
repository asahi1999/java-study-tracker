import { describe, expect, it } from 'vitest';

import { passedResult } from '@/runtime/java/fakeRunner';
import type { RunJob, RunResult } from '@/runtime/java/JavaRunner';

import {
  attemptOf,
  liveMessage,
  outputOf,
  runStatusText,
  stopReason,
  torchesOf,
  torchSummary,
} from './runSummary';

const CASES = [
  { name: '壁', stdin: '', expected: '#' },
  { name: '床', stdin: '', expected: '.' },
];

const JOB: RunJob = {
  stepId: 'ch00.a',
  rev: 1,
  source: 'compact',
  learnerFiles: [],
  givenFiles: [],
  testsJava: null,
  stdin: '',
  stages: [{ n: 1, cases: CASES }],
  timeoutMs: 3000,
};

function judged(oks: boolean[]): RunResult {
  const base = passedResult(JOB, '#\n');
  if (base.kind !== 'judged') throw new Error();
  const cases = base.stages[0].cases.map((c, i) => ({
    ...c,
    ok: oks[i],
    expected: oks[i] ? null : CASES[i].expected,
  }));
  const passed = oks.filter(Boolean).length;
  return { ...base, passed, stages: [{ ...base.stages[0], passed, cases }] };
}

describe('松明（05-visual-design.md 7-6）', () => {
  it('実行前は教材のケースの名前で全部まだ', () => {
    expect(torchesOf(null, CASES)).toEqual([
      { name: '壁', lit: false },
      { name: '床', lit: false },
    ]);
  });

  it('判定の結果で、通ったものだけともる', () => {
    const items = torchesOf(judged([true, false]), CASES);
    expect(items.map((t) => t.lit)).toEqual([true, false]);
    expect(torchSummary(items, false)).toBe('1 / 2 本ともった');
    expect(torchSummary(torchesOf(judged([true, true]), CASES), false)).toBe(
      '2 本の松明が全部ともった',
    );
    expect(torchSummary(items, true)).toBe('コンパイルが通ると松明に火が入ります');
  });

  it('時間切れは、終わったケースのあとを「まだ」で足す', () => {
    const r: RunResult = { kind: 'timeout', partialOutput: '', doneStages: [], timeoutMs: 1000 };
    expect(torchesOf(r, CASES).map((t) => t.lit)).toEqual([false, false]);
  });
});

describe('記録（attempts）の形', () => {
  it.each<[RunResult, string | null]>([
    [judged([true, true]), 'pass'],
    [judged([true, false]), 'fail'],
    [{ kind: 'compile-error', diagnostics: [] }, 'compile-error'],
    [{ kind: 'precheck', message: 'x', line: 1 }, 'compile-error'],
    [{ kind: 'timeout', partialOutput: '', doneStages: [], timeoutMs: 1000 }, 'timeout'],
    [{ kind: 'output-limit', partialOutput: '' }, 'output-limit'],
    [
      {
        kind: 'crash',
        error: { type: 'java.lang.StackOverflowError', line: null, file: null, message: null },
        partialOutput: '',
      },
      'crash',
    ],
    [{ kind: 'exited-early', code: 0, partialOutput: '' }, 'runtime-error'],
    [{ kind: 'internal-error', message: 'x' }, 'internal-error'],
    [{ kind: 'unsupported' }, null],
    [{ kind: 'cancelled' }, null],
  ])('%#: %j → %s', (result, expected) => {
    expect(attemptOf(result, 2)?.result ?? null).toBe(expected);
  });

  it('例外で落ちたケースがあれば runtime-error', () => {
    const r = judged([true, false]);
    if (r.kind !== 'judged') throw new Error();
    r.stages[0].cases[1].error = {
      type: 'java.lang.ArithmeticException',
      line: 3,
      file: 'Main.java',
      message: null,
    };
    expect(attemptOf(r, 2)).toEqual({ result: 'runtime-error', passed: 1, total: 2 });
  });
});

describe('表示の文', () => {
  it('実行ボタンの横は、状態を文字で書く', () => {
    expect(runStatusText(judged([true, true]), 700)).toEqual({
      text: 'コンパイル OK ・ 実行 0.7 秒',
      tone: 'moss',
    });
    expect(
      runStatusText({
        kind: 'compile-error',
        diagnostics: [
          {
            file: 'Main.java',
            line: 2,
            column: 5,
            severity: 'error',
            message: "';' expected",
            origin: 'learner',
          },
        ],
      }),
    ).toEqual({ text: 'コンパイルエラー 1件（2行目）', tone: 'ember' });
    expect(runStatusText(null)).toBeNull();
  });

  it('止まった理由（設計書 4-7）', () => {
    expect(
      stopReason({ kind: 'timeout', partialOutput: '', doneStages: [], timeoutMs: 3000 }),
    ).toBe('3秒たっても終わらなかった（無限ループかも）');
    expect(
      stopReason({
        kind: 'crash',
        error: { type: 'java.lang.StackOverflowError', line: null, file: null, message: null },
        partialOutput: '',
      }),
    ).toBe('StackOverflowError（再帰が深すぎる）');
    expect(stopReason({ kind: 'exited-early', code: 0, partialOutput: '' })).toBe(
      '途中で終了した（System.exit）',
    );
  });

  it('読み上げ・出力欄', () => {
    const r = judged([true, false]);
    expect(liveMessage(r, torchesOf(r, CASES))).toBe('テスト 2 本中 1 本が通りました');
    expect(outputOf(r)).toBe('#\n');
    expect(outputOf({ kind: 'timeout', partialOutput: '途中', doneStages: [], timeoutMs: 1 })).toBe(
      '途中',
    );
    expect(outputOf({ kind: 'compile-error', diagnostics: [] })).toBeNull();
  });
});
