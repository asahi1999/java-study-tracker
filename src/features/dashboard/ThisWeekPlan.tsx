import { Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buttonClassName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { WeekMark } from '@/features/roadmap/WeekMark';
import { WeekStatusBadge } from '@/features/roadmap/WeekStatusBadge';
import { formatDateRange, formatDateWithWeekday, formatStepNumber } from '@/lib/format';
import { isBreakDay } from '@/lib/schedule';
import { formatWeekRange } from '@/lib/week';
import { findNextWeekView, type WeekView } from '@/lib/weekView';
import type { Settings, Skill, Step } from '@/types';

type ThisWeekPlanProps = {
  weekViews: readonly WeekView[];
  skills: readonly Skill[];
  steps: readonly Step[];
  settings: Pick<Settings, 'startDate' | 'breakPeriods'>;
  today: string;
};

/**
 * 今週の予定。今日が予定期間に入っている週と、まだチェックしていない項目を出す。
 * 該当する週がないとき（開始前・休止中・終了後）は、次に取り組む週を案内する
 */
export function ThisWeekPlan({ weekViews, skills, steps, settings, today }: ThisWeekPlanProps) {
  const currentViews = weekViews.filter((view) => view.isCurrent);
  const nextView = currentViews.length === 0 ? findNextWeekView(weekViews) : null;

  const stepLabel = (stepId: string) => {
    const step = steps.find(({ id }) => id === stepId);
    return step ? `${formatStepNumber(step.order)} ${step.title}` : '';
  };
  const renderItem = (view: WeekView) => (
    <WeekPlanItem
      key={view.week.id}
      view={view}
      stepLabel={stepLabel(view.week.stepId)}
      skills={skills.filter((skill) => skill.weekId === view.week.id)}
    />
  );

  return (
    <Card title="今週の予定">
      {weekViews.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="週がまだありません"
          description="ロードマップ編集で、月・ステップ・週を追加できます。"
          action={
            <Link to="/editor" className={buttonClassName({ variant: 'primary' })}>
              ロードマップ編集を開く
            </Link>
          }
        />
      ) : currentViews.length > 0 ? (
        <div className="grid gap-5 divide-y divide-line [&>*+*]:pt-5">
          {currentViews.map(renderItem)}
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed">{noCurrentWeekMessage(settings, today)}</p>
          {nextView ? (
            <>
              <p className="mb-3 mt-4 text-[13px] font-bold text-muted">次に取り組む週</p>
              {renderItem(nextView)}
            </>
          ) : (
            <p className="mt-1 text-sm leading-relaxed">すべての週が完成しました。</p>
          )}
        </>
      )}
    </Card>
  );
}

function noCurrentWeekMessage(
  { startDate, breakPeriods }: Pick<Settings, 'startDate' | 'breakPeriods'>,
  today: string,
): string {
  if (today < startDate) return `学習は${formatDateWithWeekday(startDate)}から始まります。`;
  if (isBreakDay(today, breakPeriods)) return '今日は休止期間です。';
  return '今日が予定期間に入っている週はありません。';
}

type WeekPlanItemProps = {
  view: WeekView;
  stepLabel: string;
  /** この週のチェック項目 */
  skills: readonly Skill[];
};

function WeekPlanItem({ view, stepLabel, skills }: WeekPlanItemProps) {
  const { week, range, displayStatus } = view;
  const done = week.status === 'done';
  const unchecked = skills.filter((skill) => !skill.checked).sort((a, b) => a.order - b.order);

  return (
    <article>
      <div className="flex items-start gap-3">
        <WeekMark week={week} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-lg font-bold leading-snug">
              {/* 週番号は印（WeekMark）で見せているので、文字は読み上げ用にだけ入れる */}
              <span className="sr-only">{formatWeekRange(week)}</span> {week.title}
            </h3>
            <span className="shrink-0 pt-0.5">
              <WeekStatusBadge status={displayStatus} />
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            {stepLabel}
            <span aria-hidden> ・ </span>
            予定 {formatDateRange(range)}
          </p>
        </div>
      </div>

      {done ? (
        <p className="mt-4 text-sm leading-relaxed">この週は完成しました。</p>
      ) : skills.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">チェック項目はありません。</p>
      ) : unchecked.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed">
          すべての項目をチェックしました。週を開いて「完成にする」を押すと完成になります。
        </p>
      ) : (
        <>
          <p className="mt-4 text-[13px] font-bold">
            のこり{unchecked.length}項目
            <span className="font-normal text-muted">（全{skills.length}項目）</span>
          </p>
          <ul className="mt-2 grid gap-1.5">
            {unchecked.map((skill) => (
              <li key={skill.id} className="flex items-start gap-2.5 text-sm leading-relaxed">
                {/* まだチェックしていないことを示す空の四角。操作はできないので飾りとして扱う */}
                <span
                  aria-hidden
                  className="mt-[5px] size-3.5 shrink-0 rounded-sm border-[1.5px] border-muted"
                />
                {skill.label}
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        to={`/roadmap/${week.id}`}
        className={buttonClassName({
          variant: done ? 'secondary' : 'primary',
          className: 'mt-4',
        })}
      >
        {formatWeekRange(week)}を開く
      </Link>
    </article>
  );
}
