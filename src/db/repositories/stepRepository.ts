import { db } from '@/db/database';
import type { Step } from '@/types';

import { HasWeeksError } from './errors';

export const stepRepository = {
  /** 表示順に並べて取得する */
  getAll(): Promise<Step[]> {
    return db.steps.orderBy('order').toArray();
  },

  getById(id: string): Promise<Step | undefined> {
    return db.steps.get(id);
  },

  async add(input: Omit<Step, 'id'>): Promise<Step> {
    const step: Step = { ...input, id: crypto.randomUUID() };
    await db.steps.add(step);
    return step;
  },

  async update(id: string, changes: Partial<Omit<Step, 'id'>>): Promise<void> {
    await db.steps.update(id, changes);
  },

  /**
   * ステップを削除する。週が残っている場合は HasWeeksError を投げる。
   * Week.stepId は必須なので、所属先のない週を作らないため
   */
  async remove(id: string): Promise<void> {
    await db.transaction('rw', [db.steps, db.weeks], async () => {
      const weekCount = await db.weeks.where('stepId').equals(id).count();
      if (weekCount > 0) throw new HasWeeksError('ステップ');
      await db.steps.delete(id);
    });
  },
};
