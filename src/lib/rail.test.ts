import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';

import { buildWeek } from '../../tests/factories';
import { layoutRail } from './rail';

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
