import type { Settings, Skill, Week } from '@/types';

import { getWeekProgress, type Progress } from './progress';
import {
  getDisplayStatus,
  getPlannedRange,
  isDateInRange,
  type PlannedRange,
  type WeekDisplayStatus,
} from './schedule';

/** 画面に週を表示するときに必要な情報を、1つにまとめたもの */
export type WeekView = {
  week: Week;
  /** 予定期間 */
  range: PlannedRange;
  /** 「遅れ」を含む表示用の状態 */
  displayStatus: WeekDisplayStatus;
  progress: Progress;
  /** 今日が予定期間に入っているか */
  isCurrent: boolean;
};

/**
 * 週ごとに、予定期間・表示用の状態・進捗をまとめて計算する。表示順に並べて返す。
 * 一覧・路線バー・ダッシュボードが同じ計算結果を使えるようにするため
 */
export function buildWeekViews(
  weeks: readonly Week[],
  skills: readonly Skill[],
  settings: Pick<Settings, 'startDate' | 'breakPeriods'>,
  today: string,
): WeekView[] {
  return [...weeks]
    .sort((a, b) => a.order - b.order)
    .map((week) => {
      const range = getPlannedRange(week, settings);
      return {
        week,
        range,
        displayStatus: getDisplayStatus(week, range, today),
        progress: getWeekProgress(week.id, skills),
        isCurrent: isDateInRange(today, range),
      };
    });
}

/**
 * 次に取り組む週（表示順でいちばん手前の、まだ完成していない週）。
 * 現在の週がないとき（開始前・休止中・終了後）に案内するために使う。すべて完成していれば null
 */
export function findNextWeekView(views: readonly WeekView[]): WeekView | null {
  return (
    [...views].sort((a, b) => a.week.order - b.week.order).find((v) => v.week.status !== 'done') ??
    null
  );
}
