import { describe, expect, it } from 'vitest';

import { db } from './database';
import { createInitialSettings, seedIfEmpty } from './seed';

describe('createInitialSettings', () => {
  it('開始日と初期値を持つ設定を作る', () => {
    expect(createInitialSettings('2026-11-16')).toEqual({
      id: 'app',
      startDate: '2026-11-16',
      theme: 'system',
      weeklyGoalHours: 9,
      dailyGoalMinutes: 60,
      breakPeriods: [],
      schemaVersion: 1,
    });
  });
});

describe('seedIfEmpty', () => {
  it('空のDBに初期ロードマップと設定を投入する', async () => {
    const seeded = await seedIfEmpty('2026-11-16');

    expect(seeded).toBe(true);
    expect(await db.months.count()).toBe(3);
    expect(await db.steps.count()).toBe(8);
    expect(await db.weeks.count()).toBe(10);
    expect(await db.skills.count()).toBe(40);
    expect(await db.settings.get('app')).toEqual(createInitialSettings('2026-11-16'));
  });

  it('学習ログとバッジは投入しない', async () => {
    await seedIfEmpty('2026-11-16');

    expect(await db.logs.count()).toBe(0);
    expect(await db.badges.count()).toBe(0);
  });

  it('すでに設定があれば何もしない', async () => {
    await seedIfEmpty('2026-11-16');
    await db.skills.update('week-01-skill-1', { checked: true, checkedAt: '2026-11-17' });

    const seeded = await seedIfEmpty('2026-12-01');

    expect(seeded).toBe(false);
    expect(await db.weeks.count()).toBe(10);
    // 2回目の呼び出しで進捗や開始日が初期値に戻らないこと
    expect((await db.skills.get('week-01-skill-1'))?.checked).toBe(true);
    expect((await db.settings.get('app'))?.startDate).toBe('2026-11-16');
  });

  it('同時に2回呼ばれても二重に投入しない', async () => {
    const results = await Promise.all([seedIfEmpty('2026-11-16'), seedIfEmpty('2026-11-16')]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await db.weeks.count()).toBe(10);
    expect(await db.skills.count()).toBe(40);
  });
});
