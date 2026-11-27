import { describe, expect, it } from 'vitest';

import vectors from '../../../java/test-vectors/cases.json';
import { toJavaStringLiteral, toJavaStringOrNull } from './javaString.ts';

describe('toJavaStringLiteral（java/test-vectors/cases.json）', () => {
  for (const s of vectors.strings) {
    it(s.name, () => {
      expect(toJavaStringLiteral(s.value)).toBe(s.javaLiteral);
    });
  }

  it('\\u の形のエスケープを出さない', () => {
    expect(toJavaStringLiteral('\n\u0000\u001f')).not.toMatch(/\\u/);
  });
});

describe('toJavaStringOrNull', () => {
  it('null はそのまま null', () => {
    expect(toJavaStringOrNull(null)).toBe('null');
    expect(toJavaStringOrNull('a')).toBe('"a"');
  });
});
