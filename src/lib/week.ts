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

/** 週を選ぶ一覧などで使う「1週目 数当てゲーム」のような表示 */
export function formatWeekLabel(week: WeekRange & Pick<Week, 'title'>): string {
  return `${formatWeekRange(week)} ${week.title}`;
}

/** 路線バーなど狭い場所で使う短い表記（例：「1」「5–6」） */
export function formatWeekRangeShort({ weekStart, weekEnd }: WeekRange): string {
  return weekStart === weekEnd ? `${weekStart}` : `${weekStart}–${weekEnd}`;
}

/**
 * 週番号の範囲を、計算に使える形にそろえる。
 * 編集画面の入力ミスなどで不正な値が入っていても、計算結果が壊れないようにするため。
 * 1より小さい開始は1週目に、開始より前の終了は開始と同じ週に直す
 */
export function normalizeWeekSpan({ weekStart, weekEnd }: WeekRange): {
  start: number;
  end: number;
} {
  const start = Math.max(1, Math.floor(weekStart));
  const end = Math.max(start, Math.floor(weekEnd));
  return { start, end };
}
