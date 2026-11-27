// 出力欄（05-visual-design.md 6-1・7-5）。「タイル」表示は、左に出力の文字、右にタイルを同じ行の高さで並べる（行注釈）。
// 絵の問題は目標（影）を 35% で横に並べる。エラーのときも消さない
import { useEffect, useMemo, useRef, useState } from 'react';

import { describeGrid, layoutTiles, legendOf, outputLines } from '@/domain/tiles/layout';
import { TILE_LABELS } from '@/domain/tiles/tileTable';

import { TileGrid } from './TileGrid';

type Props = {
  output: string | null;
  render: 'text' | 'tiles';
  /** 絵の問題の目標（最初の判定のケースの期待する出力） */
  target?: string | null;
  tileSize?: 16 | 24 | 32;
  emptyText?: string;
};

/** 要素の幅（ResizeObserver が無い環境では null） */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? null));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function TileOutput({ output, render, target = null, tileSize = 24, emptyText }: Props) {
  const [view, setView] = useState<'tiles' | 'text'>(render === 'tiles' ? 'tiles' : 'text');
  const { ref, width } = useWidth();
  const layout = useMemo(() => (output === null ? null : layoutTiles(output)), [output]);
  const targetLayout = useMemo(() => (target ? layoutTiles(target) : null), [target]);
  const tooBig = layout?.kind === 'too-big';
  const showTiles = render === 'tiles' && view === 'tiles' && !tooBig;

  const grid = layout?.kind === 'grid' ? layout.grid : null;
  const targetGrid = targetLayout?.kind === 'grid' ? targetLayout.grid : null;
  // 行注釈の文字（等幅 14px ≒ 8.4px/字）＋タイル＋目標がパネルに入らなければ、文字の列を隠す
  const needed =
    (grid ? grid.cols * 8.4 + 16 + grid.cols * tileSize : 0) +
    (targetGrid ? 16 + targetGrid.cols * tileSize : 0);
  const showAnnotation = width === null || needed <= width;

  return (
    <div ref={ref}>
      {render === 'tiles' && (
        <div
          className="mb-3 flex items-center justify-end gap-2"
          role="group"
          aria-label="出力の表示"
        >
          {(['tiles', 'text'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`h-8 px-3 text-xs shadow-edge focus-visible:shadow-focus-in focus-visible:outline-none ${
                view === v ? 'bg-panel-2 font-bold text-ink' : 'text-ink-dim hover:bg-panel-2'
              }`}
            >
              {v === 'tiles' ? 'タイル' : '文字'}
            </button>
          ))}
        </div>
      )}

      <div className="on-well overflow-auto bg-well p-3">
        {showTiles ? (
          <div className="flex flex-wrap items-start gap-4">
            {grid ? (
              <div className="flex items-start gap-4">
                {showAnnotation && (
                  <pre
                    aria-hidden="true"
                    className="m-0 font-mono text-[14px] text-well-faint"
                    style={{ lineHeight: `${tileSize}px` }}
                  >
                    {grid.lines.join('\n')}
                  </pre>
                )}
                <TileGrid grid={grid} size={tileSize} />
              </div>
            ) : (
              <p className="text-sm text-well-dim">{emptyText ?? 'まだ実行していません。'}</p>
            )}
            {targetGrid && (
              <figure className="m-0">
                <div className="opacity-[.35]">
                  <TileGrid
                    grid={targetGrid}
                    size={tileSize}
                    label={`目標の絵。${describeGrid(targetGrid)}`}
                  />
                </div>
                <figcaption className="mt-1 text-xs text-well-dim">目標（影）</figcaption>
              </figure>
            )}
          </div>
        ) : output === null ? (
          <p className="text-sm text-well-dim">{emptyText ?? 'まだ実行していません。'}</p>
        ) : (
          <pre className="m-0 whitespace-pre font-mono text-code text-well-ink">
            {output === '' ? '（何も出力されませんでした）' : outputLines(output).join('\n')}
          </pre>
        )}
      </div>

      {tooBig && render === 'tiles' && (
        <p className="mt-2 text-xs text-ink-faint">
          大きすぎてタイルにできません（80桁×40行まで）。
        </p>
      )}
      {showTiles && grid && !showAnnotation && (
        <p className="mt-2 text-xs text-ink-faint">文字は［文字］表示で見られます。</p>
      )}
      {showTiles && grid && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-dim" aria-label="凡例">
          {legendOf(grid).map(({ ch, tile }) => (
            <li key={tile} className="flex items-center gap-1.5">
              <code className="bg-panel-2 px-1.5 font-mono text-ink">{ch}</code>
              {TILE_LABELS[tile]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
