import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';

import { formatStepNumber } from '@/lib/format';
import { getStepProgress } from '@/lib/progress';
import type { WeekView } from '@/lib/weekView';
import type { Month, Skill, Step, Week } from '@/types';

import { SectionProgress } from './SectionProgress';
import { WeekRow } from './WeekRow';

type RoadmapByStepProps = {
  months: readonly Month[];
  steps: readonly Step[];
  weeks: readonly Week[];
  skills: readonly Skill[];
  weekViews: readonly WeekView[];
};

/** ステップごとの表示。ステップの説明とアドバイス、そのステップの週を並べる */
export function RoadmapByStep({ months, steps, weeks, skills, weekViews }: RoadmapByStepProps) {
  const monthLabels = new Map(months.map((month) => [month.id, month.title]));

  return (
    <div className="grid gap-8">
      {steps.map((step) => (
        <StepSection
          key={step.id}
          step={step}
          views={weekViews.filter(({ week }) => week.stepId === step.id)}
          progress={getStepProgress(step.id, weeks, skills)}
          monthLabels={monthLabels}
        />
      ))}
    </div>
  );
}

type StepSectionProps = {
  step: Step;
  views: readonly WeekView[];
  progress: ReturnType<typeof getStepProgress>;
  monthLabels: ReadonlyMap<string, string>;
};

function StepSection({ step, views, progress, monthLabels }: StepSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <header className="mb-4">
        <h2 id={headingId} className="text-lg font-bold leading-tight">
          {formatStepNumber(step.order)} {step.title}
        </h2>
        <SectionProgress progress={progress} label={`${step.title}の進捗`} />

        {/* 説明とアドバイスは毎回読むものではないので、標準では閉じておく */}
        <details className="group mt-3 rounded-md border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 py-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden">
            学ぶ内容とアドバイス
            <ChevronDown
              aria-hidden
              className="size-4 text-muted transition-transform group-open:rotate-180"
            />
          </summary>
          <dl className="grid gap-2 px-4 pb-4 text-sm leading-relaxed">
            <div>
              <dt className="text-[13px] text-muted">学ぶ内容</dt>
              <dd>{step.description}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">アドバイス</dt>
              <dd>{step.advice}</dd>
            </div>
          </dl>
        </details>
      </header>

      {views.length === 0 ? (
        <p className="text-sm text-muted">
          このステップの週はまだありません。
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
              context={monthLabels.get(view.week.monthId) ?? ''}
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
