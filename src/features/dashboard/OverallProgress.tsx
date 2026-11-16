import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { diffInDays } from '@/lib/date';
import { formatDateWithWeekday } from '@/lib/format';
import type { Progress } from '@/lib/progress';
import { getScheduleEndDate } from '@/lib/schedule';
import type { WeekView } from '@/lib/weekView';

type OverallProgressProps = {
  progress: Progress;
  weekViews: readonly WeekView[];
  today: string;
};

/** 全体の進捗（輪）と、ゴール予定日までの残り日数 */
export function OverallProgress({ progress, weekViews, today }: OverallProgressProps) {
  const endDate = getScheduleEndDate(weekViews.map(({ range }) => range));
  const doneWeeks = weekViews.filter(({ week }) => week.status === 'done').length;
  const allDone = weekViews.length > 0 && doneWeeks === weekViews.length;

  return (
    <Card title="全体の進捗">
      <div className="flex items-center gap-5">
        {/* 駅ナンバリングの記号（上に路線の記号、下に番号）と同じ並びにしている */}
        <ProgressRing value={progress.percent} label="全体の進捗" className="size-32">
          <span className="text-[11px] font-bold leading-none tracking-widest text-muted">
            全体
          </span>
          <span className="mt-1 font-num text-[34px] font-bold leading-none">
            {progress.percent}
            <span className="ml-0.5 text-base">%</span>
          </span>
        </ProgressRing>

        <div className="min-w-0">
          {allDone ? (
            <p className="text-2xl font-bold leading-none">完走</p>
          ) : (
            endDate && <RemainingDays days={diffInDays(endDate, today)} />
          )}
          <dl className="mt-3 grid gap-1 text-[13px] leading-snug">
            {endDate && (
              <div>
                <dt className="inline text-muted">ゴール予定日 </dt>
                <dd className="inline font-bold">{formatDateWithWeekday(endDate)}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-muted">チェック項目 </dt>
              <dd className="inline font-bold">
                {progress.checked} / {progress.total}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">完成した週 </dt>
              <dd className="inline font-bold">
                {doneWeeks} / {weekViews.length}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Card>
  );
}

/** ゴール予定日（最終週の予定終了日）までの日数。過ぎたら超過した日数を出す */
function RemainingDays({ days }: { days: number }) {
  if (days === 0) {
    return <p className="text-xl font-bold leading-none">今日が最終日</p>;
  }

  const overdue = days < 0;
  return (
    <p className={`font-bold leading-none ${overdue ? 'text-status-red-fg' : ''}`}>
      {!overdue && <span className="text-sm">残り</span>}
      <span className="mx-1 font-num text-[40px]">{Math.abs(days)}</span>
      <span className="text-sm">{overdue ? '日超過' : '日'}</span>
    </p>
  );
}
