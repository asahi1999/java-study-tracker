import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { ROADMAP_GOAL } from '@/data/initialRoadmap';
import { badgeRepository, logRepository } from '@/db/repositories';
import { BreakNotice } from '@/features/dashboard/BreakNotice';
import { LateWarning } from '@/features/dashboard/LateWarning';
import { OverallProgress } from '@/features/dashboard/OverallProgress';
import { ProgressList } from '@/features/dashboard/ProgressList';
import { RecentBadges } from '@/features/dashboard/RecentBadges';
import { RecentLogs } from '@/features/dashboard/RecentLogs';
import { RoadmapRules } from '@/features/dashboard/RoadmapRules';
import { StreakCard } from '@/features/dashboard/StreakCard';
import { StudyTimeCard } from '@/features/dashboard/StudyTimeCard';
import { ThisWeekPlan } from '@/features/dashboard/ThisWeekPlan';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { useToday } from '@/hooks/useToday';
import { formatStepNumber } from '@/lib/format';
import { getMonthProgress, getOverallProgress, getStepProgress } from '@/lib/progress';
import { getMinutesInCalendarWeek, getMinutesOnDate } from '@/lib/stats';
import { getCurrentStreak, getLongestStreak } from '@/lib/streak';
import { buildWeekViews } from '@/lib/weekView';

const MINUTES_PER_HOUR = 60;

export function DashboardPage() {
  const data = useRoadmapData();
  const logs = useLiveQuery(() => logRepository.getAll());
  const earnedBadges = useLiveQuery(() => badgeRepository.getAll());
  const today = useToday();

  const weekViews = useMemo(
    () => (data ? buildWeekViews(data.weeks, data.skills, data.settings, today) : []),
    [data, today],
  );

  if (!data || !logs || !earnedBadges) {
    return (
      <>
        <PageHeader title="ダッシュボード" />
        <LoadingText />
      </>
    );
  }

  const { months, steps, weeks, skills, settings } = data;
  const todayMinutes = getMinutesOnDate(logs, today);

  return (
    <>
      <PageHeader title="ダッシュボード" description={`ゴール：${ROADMAP_GOAL}`} />

      <div className="grid gap-4">
        <LateWarning weekViews={weekViews} today={today} />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <ThisWeekPlan
            weekViews={weekViews}
            skills={skills}
            steps={steps}
            settings={settings}
            today={today}
          />
          <div className="grid gap-4">
            <OverallProgress
              progress={getOverallProgress(skills)}
              weekViews={weekViews}
              today={today}
            />
            {settings.breakPeriods.length === 0 && <BreakNotice />}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StudyTimeCard
            title="今日の学習時間"
            minutes={todayMinutes}
            goalMinutes={settings.dailyGoalMinutes}
            progressLabel="1日の目標に対する学習時間"
          />
          <StudyTimeCard
            title="今週の学習時間"
            minutes={getMinutesInCalendarWeek(logs, today)}
            goalMinutes={settings.weeklyGoalHours * MINUTES_PER_HOUR}
            progressLabel="週の目標に対する学習時間"
          />
          <StreakCard
            current={getCurrentStreak(logs, today)}
            longest={getLongestStreak(logs)}
            studiedToday={todayMinutes >= 1}
          />
        </div>

        {/* 月は3つ、ステップは8つと数が違う。横に並べると高さがそろわないので、縦に積んで中を複数列にする */}
        <ProgressList
          title="月ごとの進捗"
          emptyText="月がまだありません。"
          columnsClassName="sm:grid-cols-3"
          items={months.map((month) => ({
            id: month.id,
            label: month.title,
            progress: getMonthProgress(month.id, weeks, skills),
          }))}
        />
        <ProgressList
          title="ステップごとの進捗"
          emptyText="ステップがまだありません。"
          columnsClassName="sm:grid-cols-2"
          items={steps.map((step) => ({
            id: step.id,
            label: `${formatStepNumber(step.order)} ${step.title}`,
            progress: getStepProgress(step.id, weeks, skills),
          }))}
        />

        <div className="grid items-start gap-4 md:grid-cols-2">
          <RecentLogs logs={logs} weeks={weeks} />
          <RecentBadges earned={earnedBadges} />
        </div>

        <RoadmapRules />
      </div>
    </>
  );
}
