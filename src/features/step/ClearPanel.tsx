// クリアの表示（05-visual-design.md 7-9）。解説を出す（模範解答のコードは出さない。F-STEP-11）
import { Markdown } from '@/components/game/Markdown';
import type { StepSummary } from '@/content/schema';

import { EndActions } from './EndActions';

type Props = {
  title?: string;
  message: string;
  commentary: string | null;
  next: StepSummary | null;
};

export function ClearPanel({ title = 'ステップクリア', message, commentary, next }: Props) {
  return (
    <section
      aria-labelledby="clear-heading"
      className="notch-2 border-2 border-moss bg-moss/10 p-4"
    >
      <h2 id="clear-heading" className="font-display text-display-s text-moss">
        {title}
      </h2>
      <p className="mt-1 text-sm text-ink-dim">{message}</p>
      {commentary && (
        <div className="mt-3 border-t-2 border-moss/30 pt-3">
          <h3 className="text-xs font-bold text-moss">解説</h3>
          <Markdown text={commentary} className="mt-1 !text-sm" />
        </div>
      )}
      <div className="mt-4">
        <EndActions next={next} autoFocus />
      </div>
    </section>
  );
}
