import { describe, expect, it } from 'vitest';

import vectors from '../../../java/test-vectors/wrap.json';
import { findLastImportEnd, toLearnerPosition, wrapCompact } from './wrap.ts';

describe('wrapCompact（java/test-vectors/wrap.json）', () => {
  for (const c of vectors.cases) {
    it(c.name, () => {
      const wrapped = wrapCompact(c.input);
      expect(wrapped.source).toBe(c.output);
      // 行の数は1つ（末尾の }）だけ増える
      expect(wrapped.source.split('\n').length).toBe(c.input.split('\n').length + 1);
      for (const p of c.positions) {
        const [line, column] = p.wrapped;
        expect(toLearnerPosition(wrapped, line, column)).toEqual({
          line: p.learner[0],
          column: p.learner[1],
        });
      }
    });
  }
});

describe('findLastImportEnd', () => {
  it('import が無ければ -1', () => {
    expect(findLastImportEnd('void main() {}')).toBe(-1);
  });

  it('static import と module import も数える', () => {
    const src = 'import static java.lang.Math.max;\nimport module java.base;\nvoid main() {}';
    expect(findLastImportEnd(src)).toBe(src.indexOf('base;') + 4);
  });
});

describe('toLearnerPosition', () => {
  it('足した文字の後ろの行は変わらない', () => {
    const w = wrapCompact('void main() {\n  x\n}');
    expect(toLearnerPosition(w, 2, 3)).toEqual({ line: 2, column: 3 });
  });
});
