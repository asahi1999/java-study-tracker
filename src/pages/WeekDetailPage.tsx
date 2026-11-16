import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { buttonClassName } from '@/components/ui/Button';
import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { WeekMark } from '@/features/roadmap/WeekMark';
import { WeekStatusBadge } from '@/features/roadmap/WeekStatusBadge';
import { MemoEditor } from '@/features/week/MemoEditor';
import { SkillChecklist } from '@/features/week/SkillChecklist';
import { WeekLogs } from '@/features/week/WeekLogs';
import { WeekRecordForm } from '@/features/week/WeekRecordForm';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { useToday } from '@/hooks/useToday';
import { formatDateRange, formatStepNumber } from '@/lib/format';
import { getDisplayStatus, getPlannedRange } from '@/lib/schedule';
import { formatWeekRange } from '@/lib/week';

export function WeekDetailPage() {
  const { weekId } = useParams();
  const data = useRoadmapData();
  const today = useToday();

  if (!data) return <LoadingText />;

  const week = data.weeks.find((candidate) => candidate.id === weekId);

  if (!week) {
    return (
      <>
        <PageHeader
          title="週が見つかりません"
          description="この週は削除されたか、URLが間違っている可能性があります。"
        />
        <Link to="/roadmap" className={buttonClassName({ variant: 'primary' })}>
          ロードマップへ戻る
        </Link>
      </>
    );
  }

  const step = data.steps.find((candidate) => candidate.id === week.stepId);
  const month = data.months.find((candidate) => candidate.id === week.monthId);
  const range = getPlannedRange(week, data.settings);
  const skills = data.skills
    .filter((skill) => skill.weekId === week.id)
    .sort((a, b) => a.order - b.order);

  const context = [
    step ? `${formatStepNumber(step.order)} ${step.title}` : null,
    month?.title,
    `予定 ${formatDateRange(range)}`,
  ].filter(Boolean);

  return (
    <>
      <Link
        to="/roadmap"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        ロードマップ
      </Link>

      <header className="mb-5 flex items-start gap-3">
        <WeekMark week={week} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold leading-tight">
              {/* 週番号は印（WeekMark）で見せているので、文字は読み上げ用にだけ入れる */}
              <span className="sr-only">{formatWeekRange(week)}</span> {week.title}
            </h1>
            <WeekStatusBadge status={getDisplayStatus(week, range, today)} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">{context.join(' ・ ')}</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="grid gap-4">
          <SkillChecklist week={week} skills={skills} today={today} />
          {/* key を週ごとに変えて、別の週へ移ったときに入力中の内容を持ち越さないようにする */}
          <MemoEditor key={week.id} week={week} />
        </div>
        <div className="grid gap-4">
          <WeekRecordForm key={week.id} week={week} today={today} />
          <WeekLogs week={week} />
        </div>
      </div>
    </>
  );
}
