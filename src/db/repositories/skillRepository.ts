import { db } from '@/db/database';
import { todayString } from '@/lib/date';
import type { Skill } from '@/types';

export const skillRepository = {
  getAll(): Promise<Skill[]> {
    return db.skills.toArray();
  },

  getById(id: string): Promise<Skill | undefined> {
    return db.skills.get(id);
  },

  /** 指定した週のチェック項目を表示順に取得する */
  getByWeek(weekId: string): Promise<Skill[]> {
    return db.skills.where('weekId').equals(weekId).sortBy('order');
  },

  async add(input: Omit<Skill, 'id'>): Promise<Skill> {
    const skill: Skill = { ...input, id: crypto.randomUUID() };
    await db.skills.add(skill);
    return skill;
  },

  async update(id: string, changes: Partial<Omit<Skill, 'id'>>): Promise<void> {
    await db.skills.update(id, changes);
  },

  /** チェックを切り替える。チェックした日を記録し、外したら日付も消す */
  async setChecked(id: string, checked: boolean, today: string = todayString()): Promise<void> {
    await db.skills.update(id, { checked, checkedAt: checked ? today : null });
  },

  async remove(id: string): Promise<void> {
    await db.skills.delete(id);
  },
};
