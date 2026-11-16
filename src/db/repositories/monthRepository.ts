import { db } from '@/db/database';
import type { Month } from '@/types';

import { HasWeeksError } from './errors';

export const monthRepository = {
  /** 表示順に並べて取得する */
  getAll(): Promise<Month[]> {
    return db.months.orderBy('order').toArray();
  },

  getById(id: string): Promise<Month | undefined> {
    return db.months.get(id);
  },

  async add(input: Omit<Month, 'id'>): Promise<Month> {
    const month: Month = { ...input, id: crypto.randomUUID() };
    await db.months.add(month);
    return month;
  },

  async update(id: string, changes: Partial<Omit<Month, 'id'>>): Promise<void> {
    await db.months.update(id, changes);
  },

  /**
   * 月を削除する。週が残っている場合は HasWeeksError を投げる。
   * Week.monthId は必須なので、所属先のない週を作らないため
   */
  async remove(id: string): Promise<void> {
    await db.transaction('rw', [db.months, db.weeks], async () => {
      const weekCount = await db.weeks.where('monthId').equals(id).count();
      if (weekCount > 0) throw new HasWeeksError('月');
      await db.months.delete(id);
    });
  },
};
