// 出力の文字 → タイルの格子（設計書 8-1）。1文字＝1マス、全角は2マス、タブは空白4つ。
// 行の長さが違うときは一番長い行に合わせて右を闇で埋める。上限 80桁×40行
import { TILE_LABELS, TILE_ORDER, type TileName, tileOf } from './tileTable.ts';

export const MAX_COLS = 80;
export const MAX_ROWS = 40;

export type TileCell = {
  x: number;
  y: number;
  tile: TileName;
  ch: string;
  /** 全角（2マス）。次のマスはこのセルが占める */
  wide: boolean;
};

export type TileGrid = {
  cols: number;
  rows: number;
  cells: TileCell[]; // 闇（埋めた分を含む）も入れる。全角の2マス目は入れない
  lines: string[]; // 行注釈に出す文字（タブを空白にしたもの）
  counts: Partial<Record<TileName, number>>;
};

export type LayoutResult =
  { kind: 'grid'; grid: TileGrid } | { kind: 'too-big'; cols: number; rows: number };

/** East Asian Width が F・W の文字（主なものだけ。2マスで描く） */
export function isWide(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

/** 出力を行に分ける（\r\n をそろえ、最後の改行のあとの空行は数えない） */
export function outputLines(output: string): string[] {
  const text = output.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function lineWidth(line: string): number {
  let w = 0;
  for (const ch of line) w += isWide(ch) ? 2 : 1;
  return w;
}

export function layoutTiles(output: string): LayoutResult {
  const lines = outputLines(output);
  const rows = lines.length;
  const cols = lines.reduce((m, l) => Math.max(m, lineWidth(l)), 0);
  if (cols > MAX_COLS || rows > MAX_ROWS) return { kind: 'too-big', cols, rows };
  const cells: TileCell[] = [];
  const counts: Partial<Record<TileName, number>> = {};
  lines.forEach((line, y) => {
    let x = 0;
    for (const ch of line) {
      const wide = isWide(ch);
      const tile = tileOf(ch);
      cells.push({ x, y, tile, ch, wide });
      counts[tile] = (counts[tile] ?? 0) + 1;
      x += wide ? 2 : 1;
    }
    for (; x < cols; x++) cells.push({ x, y, tile: 'void', ch: ' ', wide: false });
  });
  return { kind: 'grid', grid: { cols, rows, cells, lines, counts } };
}

/** 格子全体の読み上げ（例:「タイル 12×5。勇者1、松明3、壁20」）。闇は数えない */
export function describeGrid(grid: TileGrid): string {
  const parts = TILE_ORDER.filter((t) => t !== 'void' && grid.counts[t]).map(
    (t) => `${TILE_LABELS[t]}${grid.counts[t]}`,
  );
  return `タイル ${grid.cols}×${grid.rows}。${parts.length > 0 ? parts.join('、') : '何もない'}`;
}

/** 凡例に出す文字（出力に出たものだけ。闇・数字・文字は除く） */
export function legendOf(grid: TileGrid): { ch: string; tile: TileName }[] {
  const seen = new Map<TileName, string>();
  for (const c of grid.cells) {
    if (c.tile === 'void' || c.tile === 'digit' || c.tile === 'glyph') continue;
    if (!seen.has(c.tile)) seen.set(c.tile, c.ch);
  }
  return TILE_ORDER.filter((t) => seen.has(t)).map((t) => ({ ch: seen.get(t) as string, tile: t }));
}
