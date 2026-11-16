import type { BreakPeriod, Settings, Week, WeekStatus } from '@/types';

import { addDaysToDate, diffInDays, isDateString } from './date';
import { normalizeWeekSpan } from './week';

/** 予定期間（開始日と終了日を含む） */
export type PlannedRange = {
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD */
  end: string;
};

type ScheduleSettings = Pick<Settings, 'startDate' | 'breakPeriods'>;

const DAYS_PER_WEEK = 7;

/**
 * 休止期間を計算しやすい形にそろえる。
 * 日付が正しくないものは捨て、開始日の順に並べ、重なっている・隣り合っているものは1つにまとめる
 */
export function normalizeBreakPeriods(breakPeriods: readonly BreakPeriod[]): PlannedRange[] {
  const sorted = breakPeriods
    .filter(({ start, end }) => isDateString(start) && isDateString(end) && start <= end)
    .map(({ start, end }) => ({ start, end }))
    .sort((a, b) => a.start.localeCompare(b.start));

  const merged: PlannedRange[] = [];
  for (const period of sorted) {
    const last = merged.at(-1);
    // 前の期間の翌日までに始まるなら、ひと続きの休みとして扱う
    if (last && period.start <= addDaysToDate(last.end, 1)) {
      if (period.end > last.end) last.end = period.end;
    } else {
      merged.push(period);
    }
  }
  return merged;
}

/** 指定した日が休止期間に入っているか */
export function isBreakDay(date: string, breakPeriods: readonly BreakPeriod[]): boolean {
  return normalizeBreakPeriods(breakPeriods).some(({ start, end }) => start <= date && date <= end);
}

/**
 * 開始日から数えて index 番目（0始まり）の「学習日」の日付を返す。
 * 休止日は学習日として数えない。こうすると、休止期間をまたぐ週は終了日が延び、
 * それ以降の週はすべて同じ日数だけ後ろへずれる
 */
export function studyDayToDate(
  startDate: string,
  index: number,
  breakPeriods: readonly BreakPeriod[],
): string {
  let date = startDate;
  let remaining = Math.max(0, Math.floor(index));

  // 1日ずつ進めるのではなく、休止期間ごとにまとめて飛び越える（長い休止でも計算が重くならない）
  for (const period of normalizeBreakPeriods(breakPeriods)) {
    if (period.end < date) continue;

    if (period.start <= date) {
      // いまの位置が休止期間の中なので、明けた日まで進める
      date = addDaysToDate(period.end, 1);
      continue;
    }

    const studyDaysBeforeBreak = diffInDays(period.start, date);
    if (remaining < studyDaysBeforeBreak) break;

    remaining -= studyDaysBeforeBreak;
    date = addDaysToDate(period.end, 1);
  }

  return addDaysToDate(date, remaining);
}

/**
 * 週の予定期間を計算する。
 * 休止期間がなければ、N週目の開始は「開始日 + (N−1)×7日」、終了は「開始日 + 終了週×7日 − 1日」になる
 */
export function getPlannedRange(
  week: Pick<Week, 'weekStart' | 'weekEnd'>,
  { startDate, breakPeriods }: ScheduleSettings,
): PlannedRange {
  const { start, end } = normalizeWeekSpan(week);
  return {
    start: studyDayToDate(startDate, (start - 1) * DAYS_PER_WEEK, breakPeriods),
    end: studyDayToDate(startDate, end * DAYS_PER_WEEK - 1, breakPeriods),
  };
}

/** すべての週の予定期間を、週のIDから引けるようにまとめる */
export function buildSchedule(
  weeks: readonly Week[],
  settings: ScheduleSettings,
): Map<string, PlannedRange> {
  return new Map(weeks.map((week) => [week.id, getPlannedRange(week, settings)]));
}

/** 指定した日が予定期間に入っているか（開始日と終了日を含む） */
export function isDateInRange(date: string, range: PlannedRange): boolean {
  return range.start <= date && date <= range.end;
}

/**
 * 現在の週（今日が予定期間に入っている週）を表示順に返す。
 * 期間が重なる週があれば2件以上になり、開始前・終了後・週と週の間の休止中は0件になる
 */
export function findCurrentWeeks(
  weeks: readonly Week[],
  schedule: ReadonlyMap<string, PlannedRange>,
  today: string,
): Week[] {
  return weeks
    .filter((week) => {
      const range = schedule.get(week.id);
      return range !== undefined && isDateInRange(today, range);
    })
    .sort((a, b) => a.order - b.order);
}

/** 遅れているか（予定終了日を過ぎていて、まだ完成していない） */
export function isWeekLate(
  week: Pick<Week, 'status'>,
  range: PlannedRange,
  today: string,
): boolean {
  return week.status !== 'done' && today > range.end;
}

/** 画面に出す状態。「遅れ」は保存せず、予定終了日と今日からその都度求める */
export type WeekDisplayStatus = WeekStatus | 'late';

export function getDisplayStatus(
  week: Pick<Week, 'status'>,
  range: PlannedRange,
  today: string,
): WeekDisplayStatus {
  return isWeekLate(week, range, today) ? 'late' : week.status;
}
