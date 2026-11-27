import { describe, expect, it } from 'vitest';

import { normalizeOutput, sameOutput } from './text.ts';

describe('normalizeOutput', () => {
  it('CRLF・行末の空白・末尾の空行を消す', () => {
    expect(normalizeOutput('a  \r\nb\t\n\n\n')).toBe('a\nb');
  });

  it('行頭の空白と全角は区別する', () => {
    expect(sameOutput(' a', 'a')).toBe(false);
    expect(sameOutput('＃', '#')).toBe(false);
    expect(sameOutput('a　', 'a')).toBe(false);
  });

  it('途中の空行は残す', () => {
    expect(normalizeOutput('a\n\nb\n')).toBe('a\n\nb');
  });
});
