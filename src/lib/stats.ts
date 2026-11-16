import type { StudyLog } from '@/types';

import { addDaysToDate, startOfWeekMonday } from './date';

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
