import { db } from '@/db/database';
import type { EarnedBadge } from '@/types';

export const badgeRepository = {
  getAll(): Promise<EarnedBadge[]> {
    return db.badges.toArray();
  },

  /**
   * バッジを獲得済みにする。すでに獲得済みなら何もしない。
   * 一度獲得したバッジは消さず、最初に獲得した日時も上書きしないため
   * @returns 今回新しく獲得したら true
   */
  async earn(id: string, earnedAt: string = new Date().toISOString()): Promise<boolean> {
    return db.transaction('rw', [db.badges], async () => {
      const existing = await db.badges.get(id);
      if (existing) return false;
      await db.badges.add({ id, earnedAt });
      return true;
    });
  },
};
