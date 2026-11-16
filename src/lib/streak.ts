import type { StudyLog } from '@/types';

import { addDaysToDate, diffInDays } from './date';

type LogTime = Pick<StudyLog, 'date' | 'minutes'>;

/** 学習した日（1日の合計が1分以上の日）の一覧 */
export function getStudyDates(logs: readonly LogTime[]): Set<string> {
  const minutesByDate = new Map<string, number>();
  for (const { date, minutes } of logs) {
    minutesByDate.set(date, (minutesByDate.get(date) ?? 0) + minutes);
  }

  const dates = new Set<string>();
  for (const [date, minutes] of minutesByDate) {
    if (minutes >= 1) dates.add(date);
  }
  return dates;
}

/**
 * 現在の連続学習日数。
 * 今日まだ学習していなければ昨日までで数える（今日のうちは、途切れたことにしない）
 */
export function getCurrentStreak(logs: readonly LogTime[], today: string): number {
  const studyDates = getStudyDates(logs);

  let date = studyDates.has(today) ? today : addDaysToDate(today, -1);
  let streak = 0;
  while (studyDates.has(date)) {
    streak += 1;
    date = addDaysToDate(date, -1);
  }
  return streak;
}

/** 連続学習日数の最長記録 */
export function getLongestStreak(logs: readonly LogTime[]): number {
  const dates = [...getStudyDates(logs)].sort();

  let longest = 0;
  let current = 0;
  let previous: string | null = null;
  for (const date of dates) {
    current = previous !== null && diffInDays(date, previous) === 1 ? current + 1 : 1;
    if (current > longest) longest = current;
    previous = date;
  }
  return longest;
}
