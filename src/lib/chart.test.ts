import { describe, expect, it } from 'vitest';

import { getHourTicks, getWeekTicks } from './chart';

describe('getWeekTicks', () => {
  it('12週なら、1週ごとに目盛りを出す', () => {
    expect(getWeekTicks(12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('16週までは1週ごと', () => {
    expect(getWeekTicks(16)).toHaveLength(16);
  });

  it('17〜32週は2週ごとに間引く', () => {
    expect(getWeekTicks(20)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  });

  it('それより長いときは、目盛りが13本以下になるように間引く', () => {
    const ticks = getWeekTicks(116);

    expect(ticks.length).toBeLessThanOrEqual(13);
    expect(ticks[0]).toBe(9);
    expect(ticks[1]).toBe(18);
  });

  it('週がなければ空', () => {
    expect(getWeekTicks(0)).toEqual([]);
  });
});

describe('getHourTicks', () => {
  it.each([
    [0, [0, 1]],
    [0.5, [0, 1]],
    [4, [0, 1, 2, 3, 4]],
    [5, [0, 2, 4, 6]],
    [9.9, [0, 3, 6, 9, 12]],
    [11.3, [0, 3, 6, 9, 12]],
    [12, [0, 3, 6, 9, 12]],
    [13, [0, 5, 10, 15]],
    [24, [0, 10, 20, 30]],
    [168, [0, 50, 100, 150, 200]],
  ])('いちばん大きい値が %s 時間なら %j', (maxHours, expected) => {
    expect(getHourTicks(maxHours)).toEqual(expected);
  });

  it('いちばん上の目盛りは、いちばん大きい値より小さくならない', () => {
    for (const maxHours of [0.1, 3.3, 7, 10.8, 17, 41, 99, 250]) {
      expect(getHourTicks(maxHours).at(-1)).toBeGreaterThanOrEqual(maxHours);
    }
  });

  it('目盛りの間隔はそろっている', () => {
    const ticks = getHourTicks(10.8);
    const gaps = ticks.slice(1).map((tick, index) => tick - ticks[index]!);

    expect(new Set(gaps).size).toBe(1);
  });
});
