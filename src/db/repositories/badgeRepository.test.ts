import { describe, expect, it } from 'vitest';

import { badgeRepository } from './badgeRepository';

describe('badgeRepository', () => {
  it('まだ獲得していなければ空の配列を返す', async () => {
    expect(await badgeRepository.getAll()).toEqual([]);
  });

  it('earn は新しいバッジを保存して true を返す', async () => {
    const earned = await badgeRepository.earn('first-log', '2026-11-16T10:00:00.000Z');

    expect(earned).toBe(true);
    expect(await badgeRepository.getAll()).toEqual([
      { id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' },
    ]);
  });

  it('earn は獲得済みなら false を返し、最初の獲得日時を上書きしない', async () => {
    await badgeRepository.earn('first-log', '2026-11-16T10:00:00.000Z');

    const earned = await badgeRepository.earn('first-log', '2026-12-01T10:00:00.000Z');

    expect(earned).toBe(false);
    expect(await badgeRepository.getAll()).toEqual([
      { id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' },
    ]);
  });

  it('earn は獲得日時を省略すると現在の日時を記録する', async () => {
    await badgeRepository.earn('first-done');

    const [badge] = await badgeRepository.getAll();
    expect(Number.isNaN(Date.parse(badge!.earnedAt))).toBe(false);
  });
});
