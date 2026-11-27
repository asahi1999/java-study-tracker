// タイルの絵（8×8 ドット）を <symbol> で1回だけ定義する。画面のどこからでも <use href="#tile-wall"> で描ける。
// 設計書 8-2 は sprites.svg の1枚だが、ドットの表（src/domain/tiles/tileTable.ts）から作るほうが確かめやすいのでここで作る
import { memo } from 'react';

import { PALETTE, SPRITES } from '@/domain/tiles/tileTable';

/** 同じ色が横に続くところは1つの矩形にまとめる */
function rects(rows: readonly string[]) {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      out.push({ x, y, w, fill: PALETTE[ch] ?? PALETTE.k });
      x += w;
    }
  });
  return out;
}

export const TileSprites = memo(function TileSprites() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute h-0 w-0 overflow-hidden">
      <defs>
        {Object.entries(SPRITES).map(([name, rows]) => (
          <symbol key={name} id={`tile-${name}`} viewBox="0 0 8 8" shapeRendering="crispEdges">
            {rects(rows).map((r) => (
              <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
            ))}
          </symbol>
        ))}
        <radialGradient id="tile-torch-glow">
          <stop offset="0" stopColor="#f4a83d" stopOpacity="0.28" />
          <stop offset="1" stopColor="#f4a83d" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
});
