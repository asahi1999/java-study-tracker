import type { StudyLog } from '@/types';

import { addDaysToDate, parseDateString, startOfWeekMonday } from './date';
import type { PlannedRange } from './schedule';
import { getMinutesByDate } from './stats';

type LogTime = Pick<StudyLog, 'date' | 'minutes'>;

/** 色の濃さ（5段階）。0: 0分 / 1: 1〜29分 / 2: 30〜59分 / 3: 60〜119分 / 4: 120分以上 */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function getHeatLevel(minutes: number): HeatLevel {
  if (minutes < 1) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

/**
 * 学習カレンダーに表示する期間。
 * 学習開始日から最終週の予定終了日まで。その外にログがあれば、その日まで広げる。
 * 週が1つもなく予定終了日が決まらないときは、今日までにする
 */
export function getHeatmapRange(
  startDate: string,
  scheduleEnd: string | null,
  logs: readonly LogTime[],
  today: string,
): PlannedRange {
  const logDates = logs.map((log) => log.date).sort();
  const start = [startDate, ...logDates.slice(0, 1)].sort()[0] ?? startDate;
  const end = [scheduleEnd ?? today, ...logDates.slice(-1), start].sort().at(-1) ?? start;
  return { start, end };
}

export type HeatCell = {
  /** YYYY-MM-DD */
  date: string;
  /** その日の学習時間（分） */
  minutes: number;
  level: HeatLevel;
};

/** カレンダーの1列（月曜〜日曜の1週間） */
export type HeatWeek = {
  /** その週の月曜日 YYYY-MM-DD */
  weekStart: string;
  /** 月曜から日曜までの7マス。表示する期間の外の日は null */
  days: (HeatCell | null)[];
};

/** 学習カレンダーのマスを、週ごと（月曜始まり）の列にして返す */
export function buildHeatmap(range: PlannedRange, logs: readonly LogTime[]): HeatWeek[] {
  const minutesByDate = getMinutesByDate(logs);
  const weeks: HeatWeek[] = [];

  for (
    let weekStart = startOfWeekMonday(range.start);
    weekStart <= range.end;
    weekStart = addDaysToDate(weekStart, 7)
  ) {
    const days = Array.from({ length: 7 }, (_, index): HeatCell | null => {
      const date = addDaysToDate(weekStart, index);
      if (date < range.start || date > range.end) return null;
      const minutes = minutesByDate.get(date) ?? 0;
      return { date, minutes, level: getHeatLevel(minutes) };
    });
    weeks.push({ weekStart, days });
  }
  return weeks;
}

/**
 * 列の上に出す月の名前（「12月」など）を、列ごとに返す。月が変わった列にだけ出し、ほかは空文字にする。
 * 先頭の列のすぐ隣で月が変わるときは、文字が重なるので先頭の列には出さない
 */
export function getMonthLabels(weeks: readonly HeatWeek[]): string[] {
  const months = weeks.map((week) => {
    const first = week.days.find((day) => day !== null);
    return first ? parseDateString(first.date).getMonth() + 1 : null;
  });

  return months.map((month, index) => {
    if (month === null) return '';
    if (index === 0) {
      const next = months[1];
      return next === undefined || next === month ? `${month}月` : '';
    }
    return month !== months[index - 1] ? `${month}月` : '';
  });
}
