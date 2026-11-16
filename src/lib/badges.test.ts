import { describe, expect, it } from 'vitest';

import { BADGE_DEFINITIONS } from '@/data/badges';

import { getRecentBadges } from './badges';

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
