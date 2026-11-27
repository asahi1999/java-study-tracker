import { describe, expect, it } from 'vitest';

import { describeGrid, isWide, layoutTiles, legendOf, MAX_COLS, MAX_ROWS } from './layout.ts';
import { CONTRAST_PAIRS, contrastRatio, tileOf } from './tileTable.ts';

function grid(output: string) {
  const r = layoutTiles(output);
  if (r.kind !== 'grid') throw new Error('too-big');
  return r.grid;
}

describe('tileOf（設計書 8-2）', () => {
  it.each([
    [' ', 'void'],
    ['.', 'floor'],
    ['#', 'wall'],
    ['@', 'hero'],
    ['>', 'stairs-down'],
    ['*', 'torch'],
    ['[', 'bar-cap'],
    ['7', 'digit'],
    ['A', 'glyph'],
    ['あ', 'glyph'],
  ])('%j → %s', (ch, tile) => {
    expect(tileOf(ch)).toBe(tile);
  });
});

describe('layoutTiles（設計書 8-1）', () => {
  it('短い行は右を闇で埋め、最後の改行のあとの空行は数えない', () => {
    const g = grid('###\n#\n');
    expect([g.cols, g.rows]).toEqual([3, 2]);
    expect(g.cells.filter((c) => c.y === 1).map((c) => c.tile)).toEqual(['wall', 'void', 'void']);
  });

  it('全角は2マス、タブは空白4つ', () => {
    const g = grid('勇@\n\t#');
    expect(g.cols).toBe(5);
    expect(g.cells.find((c) => c.ch === '勇')).toMatchObject({ x: 0, wide: true });
    expect(g.cells.find((c) => c.ch === '@')).toMatchObject({ x: 2 });
    expect(g.cells.find((c) => c.ch === '#')).toMatchObject({ x: 4, y: 1 });
    expect(isWide('ア')).toBe(true);
    expect(isWide('a')).toBe(false);
  });

  it('80桁×40行を超えたらタイルにしない', () => {
    expect(layoutTiles('#'.repeat(MAX_COLS)).kind).toBe('grid');
    expect(layoutTiles('#'.repeat(MAX_COLS + 1))).toEqual({ kind: 'too-big', cols: 81, rows: 1 });
    expect(layoutTiles('#\n'.repeat(MAX_ROWS + 1)).kind).toBe('too-big');
  });

  it('\\r\\n をそろえる', () => {
    expect(grid('#.\r\n.#\r\n').lines).toEqual(['#.', '.#']);
  });

  it('読み上げは格子の大きさと、目立つものから数える（闇は数えない）', () => {
    expect(describeGrid(grid('#*#\n#@.\n'))).toBe('タイル 3×2。勇者1、松明1、壁3、床1');
    expect(describeGrid(grid('   \n'))).toBe('タイル 3×1。何もない');
  });

  it('凡例は出力に出たタイルだけ（闇・数字・文字は除く）', () => {
    expect(legendOf(grid('#.@ 9x'))).toEqual([
      { ch: '@', tile: 'hero' },
      { ch: '#', tile: 'wall' },
      { ch: '.', tile: 'floor' },
    ]);
  });
});

describe('タイルの色（05-visual-design.md 6-2）', () => {
  it.each(CONTRAST_PAIRS)('$tile は図と地の比が 3:1 以上', ({ ground, figure }) => {
    expect(contrastRatio(ground, figure)).toBeGreaterThanOrEqual(3);
  });

  it('コントラスト比の計算（白と黒は 21:1）', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });
});
