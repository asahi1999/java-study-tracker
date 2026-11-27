import { describe, expect, it } from 'vitest';

import { wrapCompact } from '../../../domain/java/wrap.ts';
import { buildRunResult, mapDiagnostics, tailLines } from './result.ts';

const RS = '\u001e';
const line = (obj: object) => `\n${RS}@@jq ${JSON.stringify(obj)}\n`;
const hello = line({ t: 'hello', v: 2, step: 'ch00.a', rev: 1, source: 'compact' });
const asIs = line({
  t: 'case',
  stage: 0,
  i: 0,
  name: 'そのまま実行',
  ok: null,
  actual: '###\n',
  error: null,
});
const case1 = line({
  t: 'case',
  stage: 1,
  i: 1,
  name: '部屋',
  ok: true,
  actual: '###\n',
  error: null,
});
const stage1 = line({ t: 'stage', stage: 1, passed: 1, total: 1 });
const done = line({ t: 'done', step: 'ch00.a', rev: 1, passed: 1, total: 1 });

describe('buildRunResult', () => {
  it('done があれば judged。出力は段階0の標準出力、標準エラーから判定の行を除く', () => {
    const r = buildRunResult(
      {
        stdout: '###\n###\n',
        stderr: `warn${hello}${asIs}${case1}${stage1}${done}`,
        end: { kind: 'exit', code: 0 },
        ms: 5,
      },
      3000,
    );
    expect(r).toMatchObject({
      kind: 'judged',
      passed: 1,
      total: 1,
      displayOutput: '###\n',
      stderr: 'warn',
      ms: 5,
    });
    if (r.kind === 'judged') expect(r.stages[0].cases[0]).toMatchObject({ name: '部屋', ok: true });
  });

  it('時間切れ: 途中までの出力と、終わった段階', () => {
    const r = buildRunResult(
      {
        stdout: 'a\n',
        stderr: `${hello}${asIs}${case1}${stage1}`,
        end: { kind: 'timeout' },
        ms: 3000,
      },
      3000,
    );
    expect(r).toMatchObject({ kind: 'timeout', partialOutput: 'a\n', timeoutMs: 3000 });
    if (r.kind === 'timeout') expect(r.doneStages.map((s) => s.stage)).toEqual([1]);
  });

  it('limit の行があれば output-limit', () => {
    const r = buildRunResult(
      {
        stdout: 'x',
        stderr: `${hello}${line({ t: 'limit', reason: 'output' })}`,
        end: { kind: 'exit', code: 0 },
        ms: 1,
      },
      3000,
    );
    expect(r.kind).toBe('output-limit');
  });

  it('Worker の上限でも output-limit', () => {
    expect(
      buildRunResult({ stdout: '', stderr: '', end: { kind: 'limit' }, ms: 1 }, 3000).kind,
    ).toBe('output-limit');
  });

  it('done が無く終了コード 0 なら exited-early、0 以外なら crash', () => {
    expect(
      buildRunResult({ stdout: 'bye', stderr: hello, end: { kind: 'exit', code: 0 }, ms: 1 }, 3000),
    ).toEqual({
      kind: 'exited-early',
      code: 0,
      partialOutput: 'bye',
    });
    expect(
      buildRunResult({ stdout: '', stderr: hello, end: { kind: 'exit', code: 2 }, ms: 1 }, 3000),
    ).toMatchObject({
      kind: 'crash',
      error: { type: 'exit-code' },
    });
  });

  it('JS の RangeError は StackOverflowError', () => {
    const r = buildRunResult(
      {
        stdout: '',
        stderr: '',
        end: {
          kind: 'crash',
          crash: 'stack-overflow',
          message: 'Maximum call stack size exceeded',
        },
        ms: 1,
      },
      3000,
    );
    expect(r).toMatchObject({
      kind: 'crash',
      error: { type: 'java.lang.StackOverflowError', line: null },
    });
  });
});

describe('tailLines', () => {
  it('最後の N 行だけ残す', () => {
    expect(tailLines('1\n2\n3\n4\n', 2)).toBe('3\n4\n');
    expect(tailLines('1\n2\n3', 2)).toBe('2\n3');
    expect(tailLines('1\n2\n', 5)).toBe('1\n2\n');
  });
});

describe('mapDiagnostics', () => {
  it('包んだ Main.java の列を元に戻し、ファイルの種類を付ける', () => {
    const wrapped = wrapCompact('void main() {\n    System.out.println("a")\n}\n');
    const d = mapDiagnostics(
      [
        { file: 'Main.java', line: 1, column: 45, severity: 'error', message: 'x' },
        { file: 'Main.java', line: 2, column: 28, severity: 'error', message: "';' expected" },
        { file: 'JqRun.java', line: 3, column: 5, severity: 'error', message: 'y' },
      ],
      { wrapped: { 'Main.java': wrapped } },
      { 'Main.java': 'learner' },
    );
    expect(d.map((x) => [x.line, x.column, x.origin])).toEqual([
      [1, 1, 'learner'],
      [2, 28, 'learner'],
      [3, 5, 'harness'],
    ]);
  });
});
