// content-verify が、見本の教材を通し、わざと壊した教材を全部落とすこと（設計書 6-9。JDK と teavm-javac が必要）
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { verifyContent } from './content-verify.ts';
import { ROOT } from './lib/paths.ts';

const FIXTURES = path.join(ROOT, 'tests', 'content-fixtures');

describe('content-verify（JDK・teavm-javac）', () => {
  it('見本の教材（tests/content-fixtures/good）は全部 OK', async () => {
    const report = await verifyContent({
      contentDir: path.join(FIXTURES, 'good'),
      only: null,
      update: false,
      jobs: 3,
      teavm: true,
    });
    expect(report.schemaIssues).toEqual([]);
    expect(report.items.filter((i) => !i.ok)).toEqual([]);
    expect(report.items.map((i) => i.id).sort()).toEqual([
      'ch00.sample-card',
      'ch00.sample-choice',
      'ch00.sample-draw',
      'ch00.sample-fill',
      'ch00.sample-fix',
      'ch00.sample-predict',
      'ch00.sample-quiz',
      'errors.yaml semicolon-expected',
    ]);
    expect(report.ok).toBe(true);
  });

  it('わざと壊した教材（tests/content-fixtures/broken）を全部、正しい理由で落とす', async () => {
    const report = await verifyContent({
      contentDir: path.join(FIXTURES, 'broken'),
      only: null,
      update: false,
      jobs: 3,
      teavm: true,
    });
    expect(report.ok).toBe(false);
    const reasons = Object.fromEntries(report.items.map((i) => [i.id, i.problems.join('\n')]));
    const expected: Record<string, RegExp> = {
      'ch00.wrong-compile-error':
        /wrong\/Typo\.java（test）（JDK）: test と宣言したが コンパイルエラー/,
      'ch00.starter-compile-error': /Starter（test）（teavm）: test と宣言したが コンパイルエラー/,
      'ch00.solution-wrong': /Solution（JDK）: 全部の松明がともらない（0\/1/,
      'ch00.engine-mismatch': /出力が JDK と teavm で違う/,
      'ch00.wrong-passes': /全部の松明がともった/,
      'ch00.timeout-finishes': /timeout と宣言したが 判定/,
      'ch00.dex-mismatch': /図鑑「semicolon-expected」（ja）に当たらない/,
      'ch00.exception-other':
        /java\.lang\.ArithmeticException が起きない（java\.lang\.NumberFormatException）/,
      'ch00.predict-wrong-expected': /Program\.java（teavm）: 出力が expected\/0\.txt と違う/,
    };
    expect(Object.keys(reasons).sort()).toEqual(Object.keys(expected).sort());
    for (const [id, re] of Object.entries(expected)) expect(reasons[id], id).toMatch(re);
  });

  it('--only で1問だけ。当たらなければエラー', async () => {
    const good = path.join(FIXTURES, 'good');
    const one = await verifyContent({
      contentDir: good,
      only: 'ch00.sample-card',
      update: false,
      jobs: 1,
      teavm: false,
    });
    expect(one.items.map((i) => i.id)).toEqual(['ch00.sample-card']);
    const none = await verifyContent({
      contentDir: good,
      only: 'ch09',
      update: false,
      jobs: 1,
      teavm: false,
    });
    expect(none.ok).toBe(false);
    expect(none.schemaIssues[0]).toMatch(/当たる問題が無い/);
  });
});
