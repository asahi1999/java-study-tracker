import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { badgeService } from './badgeService';

describe('badgeService.awardNew', () => {
  it('渡したバッジを獲得済みにして、新しく獲得したIDを返す', async () => {
    const awarded = await badgeService.awardNew(
      ['first-log', 'first-done'],
      '2026-11-18T10:00:00.000Z',
    );

    expect(awarded).toEqual(['first-log', 'first-done']);
    expect(await db.badges.get('first-log')).toEqual({
      id: 'first-log',
      earnedAt: '2026-11-18T10:00:00.000Z',
    });
  });

  it('獲得済みのバッジは飛ばし、最初に獲得した日時を変えない', async () => {
    await db.badges.add({ id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' });

    const awarded = await badgeService.awardNew(
      ['first-log', 'streak-3'],
      '2026-11-18T10:00:00.000Z',
    );

    expect(awarded).toEqual(['streak-3']);
    expect((await db.badges.get('first-log'))?.earnedAt).toBe('2026-11-16T10:00:00.000Z');
  });

  it('同時に2回呼んでも、新しく獲得したと返すのは1回だけ（通知が二重にならない）', async () => {
    const [first, second] = await Promise.all([
      badgeService.awardNew(['first-log']),
      badgeService.awardNew(['first-log']),
    ]);

    expect([...first, ...second]).toEqual(['first-log']);
    expect(await db.badges.count()).toBe(1);
  });

  it('空の配列なら何もしない', async () => {
    expect(await badgeService.awardNew([])).toEqual([]);
    expect(await db.badges.count()).toBe(0);
  });
});
