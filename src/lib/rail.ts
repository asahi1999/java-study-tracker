import type { Week } from '@/types';

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
    const start = Math.max(1, Math.floor(week.weekStart));
    const end = Math.max(start, Math.floor(week.weekEnd));

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
