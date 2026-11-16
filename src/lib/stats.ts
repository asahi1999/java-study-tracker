import type { BreakPeriod, Settings, Step, StudyLog, Week } from '@/types';

import { addDaysToDate, diffInDays, startOfWeekMonday } from './date';
import { normalizeBreakPeriods } from './schedule';
import { getStudyDates } from './streak';

type LogTime = Pick<StudyLog, 'date' | 'minutes'>;

/** 学習時間の合計（分） */
export function sumMinutes(logs: readonly Pick<StudyLog, 'minutes'>[]): number {
  return logs.reduce((sum, log) => sum + log.minutes, 0);
}

/** 指定した日の学習時間（分） */
export function getMinutesOnDate(logs: readonly LogTime[], date: string): number {
  return sumMinutes(logs.filter((log) => log.date === date));
}

/** 指定した日を含む暦週（月曜〜日曜）の学習時間（分） */
export function getMinutesInCalendarWeek(logs: readonly LogTime[], date: string): number {
  const monday = startOfWeekMonday(date);
  const sunday = addDaysToDate(monday, 6);
  return sumMinutes(logs.filter((log) => monday <= log.date && log.date <= sunday));
}

/** 日付ごとの学習時間（分） */
export function getMinutesByDate(logs: readonly LogTime[]): Map<string, number> {
  const minutesByDate = new Map<string, number>();
  for (const { date, minutes } of logs) {
    minutesByDate.set(date, (minutesByDate.get(date) ?? 0) + minutes);
  }
  return minutesByDate;
}

/**
 * 学習開始日から今日までの日数（両端を含む）。休止日は数えない。
 * 「1日あたりの平均」の分母に使う。開始日がまだ来ていなければ 0
 */
export function countPeriodDays(
  startDate: string,
  today: string,
  breakPeriods: readonly BreakPeriod[],
): number {
  if (today < startDate) return 0;

  let days = diffInDays(today, startDate) + 1;
  for (const period of normalizeBreakPeriods(breakPeriods)) {
    const from = period.start > startDate ? period.start : startDate;
    const to = period.end < today ? period.end : today;
    if (from <= to) days -= diffInDays(to, from) + 1;
  }
  return days;
}

export type StudyAverages = {
  /** 累計の学習時間（分） */
  totalMinutes: number;
  /** 1日あたりの平均（分）。分母は開始日〜今日の日数（休止日を除く） */
  perDayMinutes: number;
  /** 学習した日あたりの平均（分） */
  perStudyDayMinutes: number;
  /** 開始日〜今日の日数（休止日を除く） */
  periodDays: number;
  /** 学習した日数 */
  studyDays: number;
};

/** 累計の学習時間と、2種類の平均を計算する。平均は分単位に四捨五入する */
export function getStudyAverages(
  logs: readonly LogTime[],
  { startDate, breakPeriods }: Pick<Settings, 'startDate' | 'breakPeriods'>,
  today: string,
): StudyAverages {
  const totalMinutes = sumMinutes(logs);
  const periodDays = countPeriodDays(startDate, today, breakPeriods);
  const studyDays = getStudyDates(logs).size;

  return {
    totalMinutes,
    perDayMinutes: periodDays > 0 ? Math.round(totalMinutes / periodDays) : 0,
    perStudyDayMinutes: studyDays > 0 ? Math.round(totalMinutes / studyDays) : 0,
    periodDays,
    studyDays,
  };
}

export type WeeklyMinutes = {
  /** その週の月曜日 YYYY-MM-DD */
  weekStart: string;
  minutes: number;
};

/**
 * 週ごと（月曜始まりの暦週）の学習時間。学習開始日の週から今日の週までを、ログがない週も含めて返す。
 * 開始日より前・今日より後のログがあれば、その週まで広げる
 */
export function getWeeklyMinutes(
  logs: readonly LogTime[],
  startDate: string,
  today: string,
): WeeklyMinutes[] {
  const dates = [startDate, today, ...logs.map((log) => log.date)].sort();
  // 開始日がまだ来ていないときは、今日の週から始める
  const first = startOfWeekMonday(dates[0] ?? today);
  const last = startOfWeekMonday(dates.at(-1) ?? today);

  const minutesByWeek = new Map<string, number>();
  for (const { date, minutes } of logs) {
    const weekStart = startOfWeekMonday(date);
    minutesByWeek.set(weekStart, (minutesByWeek.get(weekStart) ?? 0) + minutes);
  }

  const result: WeeklyMinutes[] = [];
  for (let weekStart = first; weekStart <= last; weekStart = addDaysToDate(weekStart, 7)) {
    result.push({ weekStart, minutes: minutesByWeek.get(weekStart) ?? 0 });
  }
  return result;
}

export type StepMinutes = {
  /** ステップのID。null は「週の指定なし」（週が付いていない・週が削除されたログ） */
  stepId: string | null;
  minutes: number;
  /** 累計に占める割合（0〜100の整数） */
  percent: number;
};

/**
 * ステップごとの学習時間と割合。ステップの表示順に並べ、学習時間が0分のステップも含める。
 * どのステップにも入らないログがあれば、最後に stepId が null の行を足す
 */
export function getMinutesByStep(
  logs: readonly Pick<StudyLog, 'minutes' | 'weekId'>[],
  weeks: readonly Pick<Week, 'id' | 'stepId'>[],
  steps: readonly Pick<Step, 'id' | 'order'>[],
): StepMinutes[] {
  const stepByWeek = new Map(weeks.map((week) => [week.id, week.stepId]));
  const stepIds = new Set(steps.map((step) => step.id));

  const minutesByStep = new Map<string | null, number>();
  for (const { minutes, weekId } of logs) {
    const stepId = (weekId !== null && stepByWeek.get(weekId)) || null;
    const key = stepId !== null && stepIds.has(stepId) ? stepId : null;
    minutesByStep.set(key, (minutesByStep.get(key) ?? 0) + minutes);
  }

  const total = sumMinutes(logs);
  const toRow = (stepId: string | null): StepMinutes => {
    const minutes = minutesByStep.get(stepId) ?? 0;
    return { stepId, minutes, percent: total > 0 ? Math.round((minutes / total) * 100) : 0 };
  };

  const rows = [...steps].sort((a, b) => a.order - b.order).map((step) => toRow(step.id));
  if ((minutesByStep.get(null) ?? 0) > 0) rows.push(toRow(null));
  return rows;
}
