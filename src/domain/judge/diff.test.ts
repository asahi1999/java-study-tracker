import { describe, expect, it } from 'vitest';

import { diffLines, firstDifference } from './diff.ts';

describe('diffLines（F-STEP-7）', () => {
  it('同じ行と違う行を分け、違う文字だけを印にする', () => {
    const lines = diffLines('###\n#@#\n', '###\n#.#\n');
    expect(lines[0]).toMatchObject({ line: 1, same: true });
    expect(lines[1].same).toBe(false);
    expect(lines[1].expected).toEqual([
      { text: '#', diff: false },
      { text: '@', diff: true },
      { text: '#', diff: false },
    ]);
    expect(firstDifference(lines)).toBe(2);
  });

  it('行末の空白と最後の空行は判定と同じく無視する', () => {
    expect(diffLines('a  \nb\n\n', 'a\nb').every((l) => l.same)).toBe(true);
    expect(firstDifference(diffLines('a', 'a\n'))).toBeNull();
  });

  it('行が足りない・多いときは、無い側を null にする', () => {
    const lines = diffLines('a\nb', 'a');
    expect(lines[1]).toMatchObject({ same: false, actual: null });
    expect(lines[1].expected).toEqual([{ text: 'b', diff: true }]);
  });

  it('全角の文字も1文字ずつ比べる', () => {
    expect(diffLines('ようこそ', 'ようこい')[0].actual).toEqual([
      { text: 'ようこ', diff: false },
      { text: 'い', diff: true },
    ]);
  });
});
