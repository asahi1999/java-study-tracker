import type { Week } from '@/types';

import { diffInDays } from './date';
import { isDateInRange, type PlannedRange } from './schedule';
import { normalizeWeekSpan } from './week';

/** 路線バーに置く週1つぶんの位置 */
export type RailSegment = {
  week: Week;
  /** 何列目から始まるか（1始まり。1列が1週） */
  start: number;
  /** 何列ぶんの長さか */
  span: number;
  /** 何段目に置くか（0が本線） */
  lane: number;
};

export type RailLayout = {
  segments: RailSegment[];
  /** 全体の列数（最後の週が終わる週番号） */
  columns: number;
  /** 段の数 */
  lanes: number;
};

/**
 * 週を路線バーに並べる位置を決める。
 * 期間が重なる週（初期データでは11週目の⑦と⑧）は、並走する線として別の段に置く
 */
export function layoutRail(weeks: readonly Week[]): RailLayout {
  // 同じ週に始まるものは長いほうを先に置く。本線が最後の週まで途切れずにつながるようにするため
  const sorted = [...weeks].sort(
    (a, b) => a.weekStart - b.weekStart || b.weekEnd - a.weekEnd || a.order - b.order,
  );

  // 各段で、最後に置いた週が終わる列
  const laneEnds: number[] = [];

  const segments = sorted.map((week) => {
    const { start, end } = normalizeWeekSpan(week);

    // 空いている一番上の段に置く。どの段も埋まっていれば新しい段を作る
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;

    return { week, start, span: end - start + 1, lane };
  });

  return {
    segments,
    columns: Math.max(0, ...laneEnds),
    lanes: laneEnds.length,
  };
}

/**
 * 「今日」の印を置く位置を、路線バーの左端を0・右端を1とした割合で返す。
 * 今日が予定期間に入っている週の中を、日がたつにつれて左から右へ進む。
 * 現在の週がなければ（開始前・終了後・週と週の間の休止中）null を返す
 */
export function getTodayPosition(
  layout: RailLayout,
  ranges: ReadonlyMap<string, PlannedRange>,
  today: string,
): number | null {
  // 期間が重なる週があるときは、本線（0段目）にある週を基準にする
  const current = layout.segments
    .filter(({ week }) => {
      const range = ranges.get(week.id);
      return range !== undefined && isDateInRange(today, range);
    })
    .sort((a, b) => a.lane - b.lane)[0];
  if (!current || layout.columns === 0) return null;

  const range = ranges.get(current.week.id);
  if (!range) return null;

  const totalDays = diffInDays(range.end, range.start) + 1;
  // その日の真ん中に印を置く。初日が左端に張りつかないようにするため
  const elapsedDays = diffInDays(today, range.start) + 0.5;
  const column = current.start - 1 + (elapsedDays / totalDays) * current.span;

  return column / layout.columns;
}
