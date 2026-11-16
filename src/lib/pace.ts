import type { Settings, Skill, Week } from '@/types';

import { diffInDays } from './date';
import { type PlannedRange, studyDayToDate } from './schedule';
import { normalizeWeekSpan } from './week';

/** 「予定と実績」のグラフの1点（N週目が終わった時点） */
export type PacePoint = {
  /** 何週目の終わりか。0 は開始前 */
  week: number;
  /** 予定の累計進捗率（0〜100） */
  planned: number;
  /** 実際の累計進捗率（0〜100）。まだ終わっていない週（進行中・これから）は null */
  actual: number | null;
};

export type Pace = {
  points: PacePoint[];
  /**
   * グラフの横軸の上での今日の位置（3週目の途中なら 2.x）。開始前・週がないときは null。
   * 実績の線は、最後に終わった週の点からこの位置（actualNow）までを結ぶ
   */
  todayPosition: number | null;
  /** 今日の時点の、予定の進捗率。開始前・週がないときは null */
  plannedNow: number | null;
  /** 今日の時点の、実際の進捗率 */
  actualNow: number;
};

const DAYS_PER_WEEK = 7;
/** 予定の期間を過ぎたあと、グラフを先へ延ばす週数の上限（表示が際限なく広がらないようにするため） */
const MAX_EXTRA_WEEKS = 104;

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * 予定ペースと実績を、週ごとの累計進捗率で比べるためのデータを作る。
 *
 * - 予定：各週のチェック項目を、その週の予定期間に終えるものとして数える。
 *   2週にまたがる週（5〜6週目など）は、項目を週数で等分する
 * - 実績：チェックした日（checkedAt）で数える。週が終わった時点の値だけを点にし、
 *   進行中の週は「今日の位置」と「今日の時点の進捗率」で表す（線が今日より先へ伸びないようにするため）
 * - 予定の期間を過ぎても終わっていなければ、今日の週まで横軸を延ばす（遅れた分が見えるようにするため）
 */
export function buildPace(
  weeks: readonly Week[],
  skills: readonly Skill[],
  { startDate, breakPeriods }: Pick<Settings, 'startDate' | 'breakPeriods'>,
  today: string,
): Pace {
  const weekIds = new Set(weeks.map((week) => week.id));
  const ownSkills = skills.filter((skill) => weekIds.has(skill.weekId));
  const total = ownSkills.length;
  const toPercent = (count: number) => (total > 0 ? round1((count / total) * 100) : 0);

  // チェックした日。日付が入っていない項目は、今日チェックしたものとして扱う
  const checkedDates = ownSkills
    .filter((skill) => skill.checked)
    .map((skill) => skill.checkedAt ?? today);
  const actualNow = toPercent(checkedDates.length);

  const roadmapWeeks = weeks.reduce((max, week) => Math.max(max, normalizeWeekSpan(week).end), 0);
  if (roadmapWeeks === 0) {
    return { points: [], todayPosition: null, plannedNow: null, actualNow };
  }

  /** ロードマップ上の n 週目の予定期間 */
  const rangeOf = (n: number): PlannedRange => ({
    start: studyDayToDate(startDate, (n - 1) * DAYS_PER_WEEK, breakPeriods),
    end: studyDayToDate(startDate, n * DAYS_PER_WEEK - 1, breakPeriods),
  });

  // まだ終わっていなければ今日まで、終わっていれば最後にチェックした日まで横軸を延ばす
  const allChecked = total > 0 && checkedDates.length === total;
  const lastDate = [...checkedDates, ...(allChecked ? [] : [today])].sort().at(-1) ?? today;
  let lastWeek = roadmapWeeks;
  while (lastWeek < roadmapWeeks + MAX_EXTRA_WEEKS && rangeOf(lastWeek).end < lastDate) {
    lastWeek += 1;
  }

  const skillCountByWeek = new Map<string, number>();
  for (const skill of ownSkills) {
    skillCountByWeek.set(skill.weekId, (skillCountByWeek.get(skill.weekId) ?? 0) + 1);
  }

  /** n 週目が終わった時点で、予定では何項目終わっているか */
  const plannedCount = (n: number) =>
    weeks.reduce((sum, week) => {
      const { start, end } = normalizeWeekSpan(week);
      const span = end - start + 1;
      const finishedWeeks = Math.min(Math.max(n - (start - 1), 0), span);
      return sum + ((skillCountByWeek.get(week.id) ?? 0) * finishedWeeks) / span;
    }, 0);

  const firstDay = rangeOf(1).start;
  const points: PacePoint[] = [
    {
      week: 0,
      planned: 0,
      actual: toPercent(checkedDates.filter((date) => date < firstDay).length),
    },
  ];
  let todayPosition: number | null = null;

  for (let n = 1; n <= lastWeek; n += 1) {
    const range = rangeOf(n);
    const ended = range.end <= today;

    points.push({
      week: n,
      planned: toPercent(plannedCount(n)),
      actual: ended ? toPercent(checkedDates.filter((date) => date <= range.end).length) : null,
    });

    if (range.start <= today && today <= range.end) {
      const length = diffInDays(range.end, range.start) + 1;
      todayPosition = n - 1 + (diffInDays(today, range.start) + 1) / length;
    } else if (range.end < today) {
      // 週と週の間の休止中・最後の週を過ぎたあとは、直前の週の終わりを今日の位置にする
      todayPosition = n;
    }
  }

  return {
    points,
    todayPosition,
    plannedNow: todayPosition === null ? null : interpolatePlanned(points, todayPosition),
    actualNow,
  };
}

/** 横軸の途中の位置での予定の進捗率を、前後の点から直線で求める */
function interpolatePlanned(points: readonly PacePoint[], position: number): number {
  const lower = Math.floor(position);
  const from = points[lower]?.planned ?? 0;
  const to = points[lower + 1]?.planned ?? from;
  return round1(from + (to - from) * (position - lower));
}

/** ahead: 予定より進んでいる / behind: 遅れている / on_track: 予定どおり / not_started: まだ始まっていない */
export type PaceStatus = 'ahead' | 'behind' | 'on_track' | 'not_started';

/** 進捗率の差がこの値（%）より小さければ「予定どおり」とみなす */
const ON_TRACK_MARGIN = 0.5;

/** 今日の時点で、予定より進んでいるか遅れているか */
export function getPaceStatus({
  plannedNow,
  actualNow,
}: Pick<Pace, 'plannedNow' | 'actualNow'>): PaceStatus {
  if (plannedNow === null) return 'not_started';
  const difference = actualNow - plannedNow;
  if (difference >= ON_TRACK_MARGIN) return 'ahead';
  if (difference <= -ON_TRACK_MARGIN) return 'behind';
  return 'on_track';
}

/** グラフに描く1点。週の終わりの点に、今日の時点の点を足したもの */
export type PaceChartPoint = PacePoint & { isToday?: boolean };

/**
 * グラフに描く点を作る。実績の線が今日の位置で止まるように、今日の時点の点を足す。
 * 今日がちょうど週の終わりなら、その週の点がすでにあるので足さない
 */
export function getPaceChartPoints({
  points,
  todayPosition,
  plannedNow,
  actualNow,
}: Pace): PaceChartPoint[] {
  if (todayPosition === null || plannedNow === null || Number.isInteger(todayPosition)) {
    return [...points];
  }
  const todayPoint: PaceChartPoint = {
    week: todayPosition,
    planned: plannedNow,
    actual: actualNow,
    isToday: true,
  };
  return [...points, todayPoint].sort((a, b) => a.week - b.week);
}
