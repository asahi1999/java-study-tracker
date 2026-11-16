import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';

import { buildWeek } from '../../tests/factories';
import { getTodayPosition, layoutRail } from './rail';
import { buildSchedule } from './schedule';

describe('layoutRail', () => {
  it('週がなければ列も段も0になる', () => {
    expect(layoutRail([])).toEqual({ segments: [], columns: 0, lanes: 0 });
  });

  it('重ならない週は本線（0段目）に順番に並べる', () => {
    const layout = layoutRail([
      buildWeek({ id: 'w1', weekStart: 1, weekEnd: 1 }),
      buildWeek({ id: 'w2', weekStart: 2, weekEnd: 2 }),
      buildWeek({ id: 'w3', weekStart: 3, weekEnd: 3 }),
    ]);

    expect(layout.columns).toBe(3);
    expect(layout.lanes).toBe(1);
    expect(
      layout.segments.map(({ week, start, span, lane }) => [week.id, start, span, lane]),
    ).toEqual([
      ['w1', 1, 1, 0],
      ['w2', 2, 1, 0],
      ['w3', 3, 1, 0],
    ]);
  });

  it('複数週にまたがる週は、その週数ぶんの長さにする', () => {
    const { segments } = layoutRail([buildWeek({ weekStart: 5, weekEnd: 6 })]);

    expect(segments[0]).toMatchObject({ start: 5, span: 2 });
  });

  it('期間が重なる週は別の段に置く', () => {
    const { segments, lanes } = layoutRail([
      buildWeek({ id: 'a', order: 1, weekStart: 1, weekEnd: 2 }),
      buildWeek({ id: 'b', order: 2, weekStart: 2, weekEnd: 3 }),
    ]);

    expect(lanes).toBe(2);
    expect(segments.find(({ week }) => week.id === 'a')?.lane).toBe(0);
    expect(segments.find(({ week }) => week.id === 'b')?.lane).toBe(1);
  });

  it('同じ週に始まる場合は、長いほうを本線に置く', () => {
    const { segments } = layoutRail([
      buildWeek({ id: 'short', order: 1, weekStart: 11, weekEnd: 11 }),
      buildWeek({ id: 'long', order: 2, weekStart: 11, weekEnd: 12 }),
    ]);

    expect(segments.find(({ week }) => week.id === 'long')?.lane).toBe(0);
    expect(segments.find(({ week }) => week.id === 'short')?.lane).toBe(1);
  });

  it('重なりが終わったら、空いた本線に戻る', () => {
    const { segments, lanes } = layoutRail([
      buildWeek({ id: 'a', order: 1, weekStart: 1, weekEnd: 2 }),
      buildWeek({ id: 'b', order: 2, weekStart: 2, weekEnd: 2 }),
      buildWeek({ id: 'c', order: 3, weekStart: 3, weekEnd: 3 }),
    ]);

    expect(lanes).toBe(2);
    expect(segments.find(({ week }) => week.id === 'c')?.lane).toBe(0);
  });

  it('3つ重なれば3段になる', () => {
    const { lanes } = layoutRail([
      buildWeek({ id: 'a', order: 1, weekStart: 1, weekEnd: 3 }),
      buildWeek({ id: 'b', order: 2, weekStart: 1, weekEnd: 2 }),
      buildWeek({ id: 'c', order: 3, weekStart: 2, weekEnd: 2 }),
    ]);

    expect(lanes).toBe(3);
  });

  it('渡した順番に関係なく、始まる週の順に並べる', () => {
    const { segments } = layoutRail([
      buildWeek({ id: 'w3', order: 1, weekStart: 3, weekEnd: 3 }),
      buildWeek({ id: 'w1', order: 2, weekStart: 1, weekEnd: 1 }),
    ]);

    expect(segments.map(({ week }) => week.id)).toEqual(['w1', 'w3']);
  });

  it('終わりが始まりより前の不正な週は、1週ぶんとして扱う', () => {
    const { segments, columns } = layoutRail([buildWeek({ weekStart: 4, weekEnd: 2 })]);

    expect(segments[0]).toMatchObject({ start: 4, span: 1 });
    expect(columns).toBe(4);
  });

  it('1より小さい週番号は1週目として扱う', () => {
    const { segments } = layoutRail([buildWeek({ weekStart: 0, weekEnd: 0 })]);

    expect(segments[0]).toMatchObject({ start: 1, span: 1 });
  });

  it('初期ロードマップは12列・2段になり、11週目の⑦だけが2段目に入る', () => {
    const { weeks } = createInitialRoadmap();

    const layout = layoutRail(weeks);

    expect(layout.columns).toBe(12);
    expect(layout.lanes).toBe(2);
    expect(layout.segments.filter(({ lane }) => lane === 1).map(({ week }) => week.id)).toEqual([
      'week-11-git',
    ]);
  });
});

describe('getTodayPosition', () => {
  const { weeks } = createInitialRoadmap();
  const layout = layoutRail(weeks);
  const ranges = buildSchedule(weeks, { startDate: '2026-11-16', breakPeriods: [] });

  it('1週目の初日は、1列目の左寄りに置く', () => {
    // 1列は全体の 1/12。7日間の1日目の真ん中なので、列の中の 0.5/7 の位置
    expect(getTodayPosition(layout, ranges, '2026-11-16')).toBeCloseTo(0.5 / 7 / 12);
  });

  it('週の真ん中の日は、その列の中央（駅の印の位置）に来る', () => {
    // 11/19 は1週目の4日目
    expect(getTodayPosition(layout, ranges, '2026-11-19')).toBeCloseTo(0.5 / 12);
  });

  it('日がたつにつれて右へ進む', () => {
    const monday = getTodayPosition(layout, ranges, '2026-11-16') ?? 0;
    const sunday = getTodayPosition(layout, ranges, '2026-11-22') ?? 0;
    const nextMonday = getTodayPosition(layout, ranges, '2026-11-23') ?? 0;

    expect(sunday).toBeGreaterThan(monday);
    expect(nextMonday).toBeGreaterThan(sunday);
  });

  it('2週分の週では、2列ぶんの幅を14日かけて進む', () => {
    // 12/14 は5〜6週目の初日、12/27 は最終日
    expect(getTodayPosition(layout, ranges, '2026-12-14')).toBeCloseTo((4 + (0.5 / 14) * 2) / 12);
    expect(getTodayPosition(layout, ranges, '2026-12-27')).toBeCloseTo((4 + (13.5 / 14) * 2) / 12);
  });

  it('11週目は本線にある週（11〜12週目）を基準にする', () => {
    // 1/25 は11〜12週目の初日
    expect(getTodayPosition(layout, ranges, '2027-01-25')).toBeCloseTo((10 + (0.5 / 14) * 2) / 12);
  });

  it('最終日でも右端（1）を超えない', () => {
    const position = getTodayPosition(layout, ranges, '2027-02-07') ?? 0;

    expect(position).toBeLessThan(1);
    expect(position).toBeGreaterThan(11 / 12);
  });

  it('学習開始日より前と、最後の週が終わった後は null を返す', () => {
    expect(getTodayPosition(layout, ranges, '2026-11-15')).toBeNull();
    expect(getTodayPosition(layout, ranges, '2027-02-08')).toBeNull();
  });

  it('週がなければ null を返す', () => {
    expect(getTodayPosition(layoutRail([]), new Map(), '2026-11-16')).toBeNull();
  });
});
