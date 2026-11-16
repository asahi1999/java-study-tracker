import { db } from '@/db/database';
import type { Settings } from '@/types';

export const settingsRepository = {
  /** 初期データの投入前は undefined になる */
  get(): Promise<Settings | undefined> {
    return db.settings.get('app');
  },

  async update(changes: Partial<Omit<Settings, 'id'>>): Promise<void> {
    await db.settings.update('app', changes);
  },
};
