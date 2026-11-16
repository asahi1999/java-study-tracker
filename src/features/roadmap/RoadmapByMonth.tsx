import { useId } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { formatStepNumber } from '@/lib/format';
import { getMonthProgress } from '@/lib/progress';
import type { WeekView } from '@/lib/weekView';
import type { Month, Skill, Step, Week } from '@/types';

import { SectionProgress } from './SectionProgress';
import { WeekRow } from './WeekRow';

type RoadmapByMonthProps = {
  months: readonly Month[];
  steps: readonly Step[];
  weeks: readonly Week[];
  skills: readonly Skill[];
  weekViews: readonly WeekView[];
};

/** 月ごとの表示。月のマイルストーンと、その月の週を縦の路線図として並べる */
export function RoadmapByMonth({ months, steps, weeks, skills, weekViews }: RoadmapByMonthProps) {
  const stepLabels = new Map(
    steps.map((step) => [step.id, `${formatStepNumber(step.order)} ${step.title}`]),
  );

  return (
    <div className="grid gap-8">
      {months.map((month) => (
        <MonthSection
          key={month.id}
          month={month}
          views={weekViews.filter(({ week }) => week.monthId === month.id)}
          progress={getMonthProgress(month.id, weeks, skills)}
          stepLabels={stepLabels}
        />
      ))}
    </div>
  );
}

type MonthSectionProps = {
  month: Month;
  views: readonly WeekView[];
  progress: ReturnType<typeof getMonthProgress>;
  stepLabels: ReadonlyMap<string, string>;
};

function MonthSection({ month, views, progress, stepLabels }: MonthSectionProps) {
  const headingId = useId();
  // 週が1つもない月は、達成したことにしない
  const achieved = views.length > 0 && views.every(({ week }) => week.status === 'done');

  return (
    <section aria-labelledby={headingId}>
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <h2 id={headingId} className="text-lg font-bold leading-tight">
            {month.title}
          </h2>
          {achieved && <Badge tone="green">達成</Badge>}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed">
          <span className="text-muted">マイルストーン：</span>
          {month.milestone}
        </p>
        <SectionProgress progress={progress} label={`${month.title}の進捗`} />
      </header>

      {views.length === 0 ? (
        <p className="text-sm text-muted">
          この月の週はまだありません。
          <Link to="/editor" className="font-bold text-ink underline underline-offset-2">
            ロードマップ編集
          </Link>
          から追加できます。
        </p>
      ) : (
        <ol>
          {views.map((view, index) => (
            <WeekRow
              key={view.week.id}
              view={view}
              context={stepLabels.get(view.week.stepId) ?? ''}
              previousDone={views[index - 1]?.week.status === 'done'}
              isFirst={index === 0}
              isLast={index === views.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
