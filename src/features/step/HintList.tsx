// ヒント3段（F-STEP-8）。押した段だけ開く。罰なし。3は2のあとで
import { Markdown } from '@/components/game/Markdown';

type Props = { hints: string[]; opened: number; onOpen: (level: 1 | 2 | 3) => void };

export function HintList({ hints, opened, onOpen }: Props) {
  if (hints.length === 0) return null;
  return (
    <section aria-labelledby="hint-heading" className="mt-6">
      <h2 id="hint-heading" className="mb-2 font-display text-display-s text-ink-dim">
        ヒント
      </h2>
      <ol className="grid gap-1.5">
        {hints.map((hint, i) => {
          const level = (i + 1) as 1 | 2 | 3;
          if (level <= opened) {
            return (
              <li
                key={level}
                className="bg-panel-2 px-3 py-2.5 text-sm shadow-[inset_2px_0_0_rgb(var(--torch))]"
              >
                <p className="mb-0.5 text-xs font-bold text-torch-text">ヒント {level}</p>
                <Markdown text={hint} className="!text-sm" />
              </li>
            );
          }
          const locked = level > opened + 1;
          return (
            <li key={level}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onOpen(level)}
                className="flex w-full items-center justify-between bg-panel-2 px-3 py-2.5 text-left text-sm shadow-[inset_0_0_0_1px_rgb(var(--line-strong))] hover:bg-line focus-visible:shadow-focus-in focus-visible:outline-none disabled:cursor-default disabled:bg-transparent disabled:text-ink-faint disabled:shadow-[inset_0_0_0_1px_rgb(var(--line))]"
              >
                <span>ヒント {level} を見る</span>
                {locked && <span className="text-xs text-ink-faint">{level - 1} のあとで</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
