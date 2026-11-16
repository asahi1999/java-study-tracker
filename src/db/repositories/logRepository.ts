import { db } from '@/db/database';
import type { StudyLog } from '@/types';

/** 学習日の新しい順。同じ日の中では記録した時刻の新しい順 */
function byNewest(a: StudyLog, b: StudyLog): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
}

export const logRepository = {
  /** 新しい順に取得する */
  async getAll(): Promise<StudyLog[]> {
    const logs = await db.logs.toArray();
    return logs.sort(byNewest);
  },

  /** 指定した週のログを新しい順に取得する */
  async getByWeek(weekId: string): Promise<StudyLog[]> {
    const logs = await db.logs.where('weekId').equals(weekId).toArray();
    return logs.sort(byNewest);
  },

  async add(input: Omit<StudyLog, 'id' | 'createdAt'>): Promise<StudyLog> {
    const log: StudyLog = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.logs.add(log);
    return log;
  },

  async update(id: string, changes: Partial<Omit<StudyLog, 'id' | 'createdAt'>>): Promise<void> {
    await db.logs.update(id, changes);
  },

  async remove(id: string): Promise<void> {
    await db.logs.delete(id);
  },
};
