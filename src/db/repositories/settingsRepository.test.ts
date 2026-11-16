import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { createInitialSettings } from '@/db/seed';

import { settingsRepository } from './settingsRepository';

describe('settingsRepository', () => {
  it('初期データの投入前は undefined を返す', async () => {
    expect(await settingsRepository.get()).toBeUndefined();
  });

  it('get は保存されている設定を返す', async () => {
    await db.settings.add(createInitialSettings('2026-11-16'));

    expect(await settingsRepository.get()).toEqual(createInitialSettings('2026-11-16'));
  });

  it('update は指定した項目だけを変更する', async () => {
    await db.settings.add(createInitialSettings('2026-11-16'));

    await settingsRepository.update({ theme: 'dark', weeklyGoalHours: 10 });

    expect(await settingsRepository.get()).toEqual({
      ...createInitialSettings('2026-11-16'),
      theme: 'dark',
      weeklyGoalHours: 10,
    });
  });

  it('update で休止期間を保存できる', async () => {
    await db.settings.add(createInitialSettings('2026-11-16'));
    const breakPeriods = [{ id: 'b1', label: '年末年始', start: '2026-12-29', end: '2027-01-03' }];

    await settingsRepository.update({ breakPeriods });

    expect((await settingsRepository.get())?.breakPeriods).toEqual(breakPeriods);
  });
});
