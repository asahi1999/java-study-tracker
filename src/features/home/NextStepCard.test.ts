import { describe, expect, it } from 'vitest';

import { draftExcerpt, firstLines } from './NextStepCard';

describe('ホームのカードの部品（05-visual-design.md 7-3）', () => {
  it('問題文の冒頭3行（空行は数えない）', () => {
    expect(firstLines('1行目\n\n2行目\n3行目\n4行目')).toBe('1行目\n\n2行目\n\n3行目');
    expect(firstLines(null)).toBe('');
  });

  it('前回の続き: カーソルの行を中心に最大5行', () => {
    const code = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].join('\n');
    expect(draftExcerpt(code, 5)).toEqual({ from: 3, lines: ['c', 'd', 'e', 'f', 'g'] });
    expect(draftExcerpt(code, 1)).toEqual({ from: 1, lines: ['a', 'b', 'c', 'd', 'e'] });
    expect(draftExcerpt(code, 8)).toEqual({ from: 4, lines: ['d', 'e', 'f', 'g', 'h'] });
    expect(draftExcerpt('x\ny', null)).toEqual({ from: 1, lines: ['x', 'y'] });
  });
});
