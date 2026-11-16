import type { Week, WeekStatus } from '@/types';

export const WEEK_STATUS_LABELS: Record<WeekStatus, string> = {
  not_started: '未着手',
  in_progress: '進行中',
  done: '完成',
};

type WeekRange = Pick<Week, 'weekStart' | 'weekEnd'>;

/** 「1週目」「5〜6週目」のような表示用の文字列を作る */
export function formatWeekRange({ weekStart, weekEnd }: WeekRange): string {
  return weekStart === weekEnd ? `${weekStart}週目` : `${weekStart}〜${weekEnd}週目`;
}

/** 路線バーなど狭い場所で使う短い表記（例：「1」「5–6」） */
export function formatWeekRangeShort({ weekStart, weekEnd }: WeekRange): string {
  return weekStart === weekEnd ? `${weekStart}` : `${weekStart}–${weekEnd}`;
}
