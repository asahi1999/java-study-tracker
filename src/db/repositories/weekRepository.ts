import { db } from '@/db/database';
import type { Week } from '@/types';

export const weekRepository = {
  /** 表示順に並べて取得する */
  getAll(): Promise<Week[]> {
    return db.weeks.orderBy('order').toArray();
  },

  getById(id: string): Promise<Week | undefined> {
    return db.weeks.get(id);
  },

  async add(input: Omit<Week, 'id'>): Promise<Week> {
    const week: Week = { ...input, id: crypto.randomUUID() };
    await db.weeks.add(week);
    return week;
  },

  async update(id: string, changes: Partial<Omit<Week, 'id'>>): Promise<void> {
    await db.weeks.update(id, changes);
  },

  /**
   * 週を削除する。チェック項目は一緒に削除し、学習ログは残す。
   * 学習した事実まで消えると累計時間や連続日数が変わってしまうため、
   * ログは週との紐づけだけを外す
   */
  async remove(id: string): Promise<void> {
    await db.transaction('rw', [db.weeks, db.skills, db.logs], async () => {
      await db.skills.where('weekId').equals(id).delete();
      await db.logs.where('weekId').equals(id).modify({ weekId: null });
      await db.weeks.delete(id);
    });
  },
};
