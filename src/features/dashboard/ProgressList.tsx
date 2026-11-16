import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Progress } from '@/lib/progress';

export type ProgressListItem = {
  id: string;
  /** 例：「1ヶ月目」「① Javaの基礎」 */
  label: string;
  progress: Progress;
};

type ProgressListProps = {
  /** 例：「月ごとの進捗」 */
  title: string;
  items: readonly ProgressListItem[];
  /** 項目が1つもないときの案内 */
  emptyText: string;
  /** 画面が広いときの列数を決めるクラス名（例：sm:grid-cols-3） */
  columnsClassName?: string;
};

/** 月ごと・ステップごとの進捗率を、バーで並べて見せる */
export function ProgressList({ title, items, emptyText, columnsClassName }: ProgressListProps) {
  return (
    <Card title={title}>
      {items.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">{emptyText}</p>
      ) : (
        <ul className={`grid gap-x-8 gap-y-3 ${columnsClassName ?? ''}`}>
          {items.map(({ id, label, progress }) => (
            <li key={id}>
              <div className="flex items-baseline justify-between gap-3 text-sm leading-snug">
                <span className="min-w-0">{label}</span>
                <span className="shrink-0 font-bold">{progress.percent}%</span>
              </div>
              <ProgressBar value={progress.percent} label={`${label}の進捗`} className="mt-1.5" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
