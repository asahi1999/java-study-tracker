import { describe, expect, it } from 'vitest';

import { normalizePredict, samePredict } from './predict.ts';

describe('samePredict', () => {
  it('全角・半角をそろえる', () => {
    expect(samePredict('##\n3\n', '＃＃\n３')).toBe(true);
  });

  it('行末の空白と最後の空行を無視する', () => {
    expect(samePredict('a\nb\n', 'a  \r\nb\n\n')).toBe(true);
  });

  it('行頭の空白と行の数は区別する', () => {
    expect(samePredict('a', ' a')).toBe(false);
    expect(samePredict('a\nb', 'a\n\nb')).toBe(false);
  });

  it('全角の空白は半角の空白になる', () => {
    expect(normalizePredict('a　b')).toBe('a b');
  });
});
