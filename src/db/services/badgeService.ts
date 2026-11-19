import { db } from '@/db/database';
import { badgeRepository } from '@/db/repositories';

export const badgeService = {
  /**
   * バッジをまとめて獲得済みにする。すでに獲得済みのものは飛ばす。
   * 画面の判定が同時に2回走っても（別のタブ・開発時の二重実行など）、同じバッジを2回知らせないよう、
   * 「まだ獲得していないか確かめて足す」を1つのトランザクションで行う
   * @returns 今回新しく獲得したバッジのID（渡した順）
   */
  async awardNew(
    ids: readonly string[],
    earnedAt: string = new Date().toISOString(),
  ): Promise<string[]> {
    return db.transaction('rw', [db.badges], async () => {
      const awarded: string[] = [];
      for (const id of ids) {
        if (await badgeRepository.earn(id, earnedAt)) awarded.push(id);
      }
      return awarded;
    });
  },
};
