import { describe, expect, it } from 'vitest';

import { BADGE_DEFINITIONS } from '@/data/badges';
import { createInitialRoadmap } from '@/data/initialRoadmap';
import type { Week } from '@/types';

import { buildLog } from '../../tests/factories';
import {
  type BadgeInput,
  evaluateBadges,
  FIXED_TARGET_BADGE_IDS,
  getNewBadgeIds,
  getRecentBadges,
} from './badges';

describe('getRecentBadges', () => {
  const earned = [
    { id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' },
    { id: 'streak-3', earnedAt: '2026-11-18T10:00:00.000Z' },
    { id: 'first-done', earnedAt: '2026-11-17T10:00:00.000Z' },
  ];

  it('獲得した日時の新しい順に並べる', () => {
    const badges = getRecentBadges(earned, BADGE_DEFINITIONS);

    expect(badges.map(({ id }) => id)).toEqual(['streak-3', 'first-done', 'first-log']);
  });

  it('名前と条件、獲得した日時を付ける', () => {
    expect(getRecentBadges(earned, BADGE_DEFINITIONS)[0]).toEqual({
      id: 'streak-3',
      name: '三日坊主卒業',
      condition: '3日連続で学習',
      earnedAt: '2026-11-18T10:00:00.000Z',
    });
  });

  it('件数を指定すると、新しいものからその件数だけ返す', () => {
    const badges = getRecentBadges(earned, BADGE_DEFINITIONS, 2);

    expect(badges.map(({ id }) => id)).toEqual(['streak-3', 'first-done']);
  });

  it('定義にないIDは除く', () => {
    const badges = getRecentBadges(
      [...earned, { id: 'unknown', earnedAt: '2026-11-19T10:00:00.000Z' }],
      BADGE_DEFINITIONS,
      3,
    );

    expect(badges.map(({ id }) => id)).toEqual(['streak-3', 'first-done', 'first-log']);
  });

  it('獲得したバッジがなければ空の配列を返す', () => {
    expect(getRecentBadges([], BADGE_DEFINITIONS)).toEqual([]);
  });
});

// 2026-11-16 は月曜日。1ヶ月目（1〜4週目）の予定終了日は 2026-12-13
const SETTINGS = { startDate: '2026-11-16', breakPeriods: [] };

function input(prepare?: (weeks: Week[]) => void, logs: BadgeInput['logs'] = []): BadgeInput {
  const { weeks } = createInitialRoadmap();
  prepare?.(weeks);
  return { weeks, logs, settings: SETTINGS };
}

/** 指定した週を、指定した日に完成したことにする */
function complete(weeks: Week[], ids: readonly string[], completedAt = '2026-11-20') {
  for (const week of weeks) {
    if (ids.includes(week.id)) Object.assign(week, { status: 'done', completedAt });
  }
}

/** 連続した日付のログ（1日60分） */
function dailyLogs(start: string, days: number, minutes = 60) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(2026, 10, Number(start.slice(8)) + index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return buildLog({ id: `l${index}`, date: value, minutes });
  });
}

const MONTH_1 = ['week-01', 'week-02', 'week-03', 'week-04'];
const MONTH_2 = ['week-05-06', 'week-07', 'week-08'];

describe('evaluateBadges', () => {
  it('何もしていなければ、どのバッジも満たさない', () => {
    expect(evaluateBadges(input())).toEqual(new Set());
  });

  it('学習ログが1件あれば「はじめの一歩」', () => {
    expect(evaluateBadges(input(undefined, [buildLog()])).has('first-log')).toBe(true);
  });

  it('週が1つ完成すれば「初完成」', () => {
    expect(evaluateBadges(input((weeks) => complete(weeks, ['week-03']))).has('first-done')).toBe(
      true,
    );
  });

  it.each([
    [2, []],
    [3, ['streak-3']],
    [7, ['streak-3', 'streak-7']],
    [30, ['streak-3', 'streak-7', 'streak-30']],
  ])('%i日連続で学習すると、連続学習のバッジ %j', (days, expected) => {
    const result = evaluateBadges(input(undefined, dailyLogs('2026-11-01', days)));

    expect(['streak-3', 'streak-7', 'streak-30'].filter((id) => result.has(id))).toEqual(expected);
  });

  it('連続学習は最長記録で判定する（いまは途切れていても獲得できる）', () => {
    const logs = [...dailyLogs('2026-11-01', 3), buildLog({ id: 'x', date: '2026-11-10' })];

    expect(evaluateBadges(input(undefined, logs)).has('streak-3')).toBe(true);
  });

  it.each([
    [599, []],
    [600, ['hours-10']],
    [3000, ['hours-10', 'hours-50']],
    [6000, ['hours-10', 'hours-50', 'hours-100']],
  ])('累計 %i 分なら、累計時間のバッジ %j', (minutes, expected) => {
    const result = evaluateBadges(input(undefined, [buildLog({ minutes })]));

    expect(['hours-10', 'hours-50', 'hours-100'].filter((id) => result.has(id))).toEqual(expected);
  });

  it('1ヶ月目の週がすべて完成すれば「1ヶ月目クリア」。1つでも残っていれば満たさない', () => {
    expect(
      evaluateBadges(input((weeks) => complete(weeks, MONTH_1.slice(0, 3)))).has('month-1'),
    ).toBe(false);
    expect(evaluateBadges(input((weeks) => complete(weeks, MONTH_1))).has('month-1')).toBe(true);
  });

  it('2ヶ月目の週がすべて完成すれば「2ヶ月目クリア」', () => {
    expect(evaluateBadges(input((weeks) => complete(weeks, MONTH_2))).has('month-2')).toBe(true);
  });

  it.each([
    ['oop', ['week-05-06']],
    ['sql', ['week-07', 'week-08']],
    ['spring', ['week-09-10']],
  ])('「%s」は、そのステップの週がすべて完成したら満たす', (id, weekIds) => {
    expect(evaluateBadges(input((weeks) => complete(weeks, weekIds))).has(id)).toBe(true);
  });

  it('月・ステップのバッジは初期データの固定IDで判定する（そのIDの週が1つもなければ満たさない）', () => {
    const result = evaluateBadges(
      input((weeks) => {
        complete(
          weeks,
          weeks.map((week) => week.id),
        );
        for (const week of weeks) {
          if (week.monthId === 'month-1') week.monthId = 'my-month';
          if (week.stepId === 'step-4') week.stepId = 'my-step';
        }
      }),
    );

    expect(result.has('month-1')).toBe(false);
    expect(result.has('oop')).toBe(false);
  });

  it('GitHub の URL が入った週が5つ以上なら「GitHub常連」。同じURLも週ごとに数える', () => {
    const withUrls = (count: number) =>
      input((weeks) =>
        weeks.slice(0, count).forEach((week) => {
          week.repoUrl = 'https://github.com/asahi1999/vocabulary';
        }),
      );

    expect(evaluateBadges(withUrls(4)).has('repo-5')).toBe(false);
    expect(evaluateBadges(withUrls(5)).has('repo-5')).toBe(true);
  });

  describe('予定どおり（on-time）', () => {
    it('ある月の週がすべて、予定終了日までに完成していれば満たす', () => {
      // 1〜4週目の予定終了日は 11/22・11/29・12/6・12/13
      const result = evaluateBadges(
        input((weeks) => {
          complete(weeks, ['week-01'], '2026-11-22');
          complete(weeks, ['week-02'], '2026-11-29');
          complete(weeks, ['week-03'], '2026-12-01');
          complete(weeks, ['week-04'], '2026-12-13');
        }),
      );

      expect(result.has('on-time')).toBe(true);
    });

    it('1週でも予定終了日を過ぎて完成していれば満たさない', () => {
      const result = evaluateBadges(
        input((weeks) => {
          complete(weeks, ['week-01'], '2026-11-23');
          complete(weeks, ['week-02', 'week-03', 'week-04'], '2026-11-25');
        }),
      );

      expect(result.has('on-time')).toBe(false);
    });

    it('休止期間で予定がずれていれば、ずれた予定終了日で判定する', () => {
      // 4週目だけ、もとの予定終了日（12/13）の2日後に完成した
      const lateWeek4 = (weeks: Week[]) => {
        complete(weeks, ['week-01', 'week-02', 'week-03'], '2026-11-20');
        complete(weeks, ['week-04'], '2026-12-15');
      };
      const withBreak = {
        startDate: '2026-11-16',
        breakPeriods: [{ id: 'b', label: '休み', start: '2026-11-20', end: '2026-11-22' }],
      };

      // 休止期間がなければ遅れ。3日の休止期間があれば、4週目の予定終了日は 12/16 になるので予定どおり
      expect(evaluateBadges(input(lateWeek4)).has('on-time')).toBe(false);
      expect(evaluateBadges({ ...input(lateWeek4), settings: withBreak }).has('on-time')).toBe(
        true,
      );
    });

    it('完了日が入っていない週があれば満たさない', () => {
      const result = evaluateBadges(
        input((weeks) => {
          complete(weeks, MONTH_1, '2026-11-20');
          weeks[0]!.completedAt = null;
        }),
      );

      expect(result.has('on-time')).toBe(false);
    });
  });

  it('すべての週が完成すれば「ロードマップ完走」。週が1つもなければ満たさない', () => {
    expect(
      evaluateBadges(
        input((weeks) =>
          complete(
            weeks,
            weeks.map((week) => week.id),
          ),
        ),
      ).has('complete'),
    ).toBe(true);
    expect(evaluateBadges({ weeks: [], logs: [], settings: SETTINGS }).has('complete')).toBe(false);
  });

  it('16個すべてのバッジに判定がある', () => {
    const everything = input(
      (weeks) => {
        complete(
          weeks,
          weeks.map((week) => week.id),
          '2026-11-17',
        );
        for (const week of weeks) week.repoUrl = 'https://github.com/asahi1999/x';
      },
      dailyLogs('2026-11-01', 30, 240),
    );

    expect(evaluateBadges(everything).size).toBe(16);
  });
});

describe('FIXED_TARGET_BADGE_IDS', () => {
  // 削除の確認で「獲得できなくなる」と知らせる対応表が、実際の判定とずれていないか確かめる
  it.each(Object.entries(FIXED_TARGET_BADGE_IDS))(
    '%s の週をすべて完成すると、バッジ %s を獲得する',
    (targetId, badgeId) => {
      const result = evaluateBadges(
        input((weeks) =>
          complete(
            weeks,
            weeks
              .filter((week) => week.monthId === targetId || week.stepId === targetId)
              .map((week) => week.id),
          ),
        ),
      );
      expect(result.has(badgeId)).toBe(true);
    },
  );

  it('対応表のバッジはすべて定義にある', () => {
    const ids = new Set(BADGE_DEFINITIONS.map((badge) => badge.id));
    expect(Object.values(FIXED_TARGET_BADGE_IDS).every((id) => ids.has(id))).toBe(true);
  });
});

describe('getNewBadgeIds', () => {
  const definitions = [
    { id: 'a', name: 'A', condition: '' },
    { id: 'b', name: 'B', condition: '' },
    { id: 'c', name: 'C', condition: '' },
  ];

  it('条件を満たしていて、まだ獲得していないものを定義の順に返す', () => {
    const result = getNewBadgeIds(
      new Set(['c', 'a', 'b']),
      [{ id: 'b', earnedAt: 'x' }],
      definitions,
    );

    expect(result).toEqual(['a', 'c']);
  });

  it('獲得済みのバッジは、条件を満たさなくなっても返さない（消さない）', () => {
    expect(getNewBadgeIds(new Set(), [{ id: 'a', earnedAt: 'x' }], definitions)).toEqual([]);
  });

  it('定義にないIDは返さない', () => {
    expect(getNewBadgeIds(new Set(['zzz']), [], definitions)).toEqual([]);
  });
});
