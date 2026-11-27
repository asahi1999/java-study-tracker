// 出力の文字をタイルで描く（設計書 8-1）。格子全体を1枚の SVG にし、マスは <use> で描く。
// 読み上げは格子全体の aria-label だけ（各マスは読まない）
import { memo } from 'react';

import type { TileCell, TileGrid as Grid } from '@/domain/tiles/layout';
import { describeGrid } from '@/domain/tiles/layout';
import { GLYPH_COLORS } from '@/domain/tiles/tileTable';

function symbolOf(c: TileCell): string {
  if (c.tile === 'floor') return (c.x + c.y) % 2 === 0 ? 'floor-a' : 'floor-b';
  if (c.tile === 'bar-cap') return c.ch === ']' ? 'bar-cap-r' : 'bar-cap-l';
  return c.tile;
}

type Props = {
  grid: Grid;
  /** 1マスの大きさ（px）。8 の倍数だけ（05-visual-design.md 6-1） */
  size: number;
  label?: string;
  className?: string;
};

export const TileGrid = memo(function TileGrid({ grid, size, label, className }: Props) {
  const w = grid.cols * 8;
  const h = grid.rows * 8;
  const torches = grid.cells.filter((c) => c.tile === 'torch');
  return (
    <svg
      role="img"
      aria-label={label ?? describeGrid(grid)}
      width={grid.cols * size}
      height={grid.rows * size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={`block shrink-0 bg-well ${className ?? ''}`}
    >
      {grid.cells.map((c) =>
        c.tile === 'digit' || c.tile === 'glyph' ? (
          <g key={`${c.x}-${c.y}`}>
            <rect
              x={c.x * 8}
              y={c.y * 8}
              width={c.wide ? 16 : 8}
              height={8}
              fill={GLYPH_COLORS.ground}
            />
            <text
              x={c.x * 8 + (c.wide ? 8 : 4)}
              y={c.y * 8 + 6.4}
              fontSize={7}
              textAnchor="middle"
              fontFamily='"IBM Plex Mono", "BIZ UDPGothic", monospace'
              fontWeight={c.tile === 'digit' ? 600 : 400}
              fill={c.tile === 'digit' ? GLYPH_COLORS.digit : GLYPH_COLORS.glyph}
            >
              {c.ch}
            </text>
          </g>
        ) : (
          <use
            key={`${c.x}-${c.y}`}
            href={`#tile-${symbolOf(c)}`}
            x={c.x * 8}
            y={c.y * 8}
            width={8}
            height={8}
          />
        ),
      )}
      {/* 松明の光（飾り。横3マス×縦2.5マス） */}
      {torches.map((c) => (
        <ellipse
          key={`glow-${c.x}-${c.y}`}
          cx={c.x * 8 + 4}
          cy={c.y * 8 + 4}
          rx={12}
          ry={10}
          fill="url(#tile-torch-glow)"
          pointerEvents="none"
        />
      ))}
    </svg>
  );
});
