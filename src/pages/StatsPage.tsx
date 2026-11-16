import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { logRepository } from '@/db/repositories';
import { PaceDiagram } from '@/features/stats/PaceDiagram';
import { StatsSummary } from '@/features/stats/StatsSummary';
import { StepTimeList } from '@/features/stats/StepTimeList';
import { StudyCalendar } from '@/features/stats/StudyCalendar';
import { WeeklyHoursChart } from '@/features/stats/WeeklyHoursChart';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { useToday } from '@/hooks/useToday';
import { formatStepNumber } from '@/lib/format';
import { buildHeatmap, getHeatmapRange } from '@/lib/heatmap';
import { buildPace, getPaceStatus } from '@/lib/pace';
import { getOverallProgress } from '@/lib/progress';
import { buildSchedule, getScheduleEndDate } from '@/lib/schedule';
import { getMinutesByStep, getStudyAverages, getWeeklyMinutes } from '@/lib/stats';

export function StatsPage() {
  const data = useRoadmapData();
  const logs = useLiveQuery(() => logRepository.getAll());
  const today = useToday();

  const stats = useMemo(() => {
    if (!data || !logs) return null;
    const { steps, weeks, skills, settings } = data;

    const scheduleEnd = getScheduleEndDate([...buildSchedule(weeks, settings).values()]);
    const pace = buildPace(weeks, skills, settings, today);
    const stepLabels = new Map(
      steps.map((step) => [step.id, `${formatStepNumber(step.order)} ${step.title}`]),
    );

    return {
      averages: getStudyAverages(logs, settings, today),
      pace,
      paceStatus: getPaceStatus(pace),
      progress: getOverallProgress(skills),
      heatmap: buildHeatmap(getHeatmapRange(settings.startDate, scheduleEnd, logs, today), logs),
      weekly: getWeeklyMinutes(logs, settings.startDate, today),
      stepItems: getMinutesByStep(logs, weeks, steps).map((row) => ({
        key: row.stepId ?? 'none',
        label: row.stepId === null ? '週の指定なし' : (stepLabels.get(row.stepId) ?? ''),
        minutes: row.minutes,
        percent: row.percent,
      })),
    };
  }, [data, logs, today]);

  if (!data || !stats) {
    return (
      <>
        <PageHeader title="統計" />
        <LoadingText />
      </>
    );
  }

  return (
    <>
      <PageHeader title="統計" description="学習時間と、予定に対する進み具合の記録です。" />

      <div className="grid gap-4">
        <StatsSummary averages={stats.averages} />
        <PaceDiagram pace={stats.pace} status={stats.paceStatus} progress={stats.progress} />
        <div className="grid items-start gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <StudyCalendar weeks={stats.heatmap} today={today} />
          <WeeklyHoursChart weeks={stats.weekly} goalHours={data.settings.weeklyGoalHours} />
        </div>
        <StepTimeList items={stats.stepItems} />
      </div>
    </>
  );
}
