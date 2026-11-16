import { TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';

import { diffInDays } from '@/lib/date';
import { formatShortDate } from '@/lib/format';
import { formatWeekRange } from '@/lib/week';
import type { WeekView } from '@/lib/weekView';

/** 遅れている週（予定終了日を過ぎて、まだ完成していない週）の警告。なければ何も出さない */
export function LateWarning({
  weekViews,
  today,
}: {
  weekViews: readonly WeekView[];
  today: string;
}) {
  const headingId = useId();
  const lateViews = weekViews.filter(({ displayStatus }) => displayStatus === 'late');

  if (lateViews.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-md border border-status-red bg-status-red-bg p-4 sm:p-5"
    >
      <h2 id={headingId} className="flex items-center gap-2 font-bold text-status-red-fg">
        <TriangleAlert aria-hidden className="size-5 shrink-0" />
        遅れている週が{lateViews.length}つあります
      </h2>
      <ul className="mt-3 grid gap-1.5">
        {lateViews.map(({ week, range }) => (
          <li key={week.id} className="text-sm leading-relaxed">
            <Link to={`/roadmap/${week.id}`} className="font-bold underline underline-offset-2">
              {formatWeekRange(week)} {week.title}
            </Link>
            <span className="ml-2 text-[13px] text-status-red-fg">
              予定は{formatShortDate(range.end)}まで（{diffInDays(today, range.end)}日超過）
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-relaxed">
        学習を休んだ期間があるときは、設定で休止期間を登録すると予定日がその分うしろにずれます。
      </p>
    </section>
  );
}
