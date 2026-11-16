import { db } from '@/db/database';
import { logRepository, skillRepository, weekRepository } from '@/db/repositories';
import { todayString } from '@/lib/date';
import {
  canCompleteWeek,
  getAutoStartChanges,
  getCompleteChanges,
  getReopenChanges,
  isChecklistLocked,
} from '@/lib/weekStatus';

import { ChecklistLockedError, WeekNotCompletableError } from './errors';

// 複数のテーブルにまたがる「手順」をまとめる層。
// repositories は1つのテーブルの読み書きだけ、lib は判定だけを受け持ち、
// ここでは「読む → 判定する → 書く」を1つのトランザクションにまとめる。
// 途中で失敗したときに、項目だけ更新されて週の状態が変わらない、という中途半端な状態を残さないため

export const weekService = {
  /**
   * 項目のチェックを切り替える。
   * その週が未着手で、今回のチェックで手をつけたことになるなら「進行中」にする
   */
  async setSkillChecked(
    skillId: string,
    checked: boolean,
    today: string = todayString(),
  ): Promise<void> {
    await db.transaction('rw', [db.skills, db.weeks, db.logs], async () => {
      const skill = await skillRepository.getById(skillId);
      if (!skill) return;
      const week = await weekRepository.getById(skill.weekId);
      if (!week) return;
      if (isChecklistLocked(week)) throw new ChecklistLockedError();

      await skillRepository.setChecked(skillId, checked, today);

      const [skills, logs] = await Promise.all([
        skillRepository.getByWeek(week.id),
        logRepository.getByWeek(week.id),
      ]);
      const changes = getAutoStartChanges(week, skills, logs, today);
      if (changes) await weekRepository.update(week.id, changes);
    });
  },

  /** 週を「完成」にする。チェックしていない項目が残っていれば WeekNotCompletableError を投げる */
  async complete(weekId: string, today: string = todayString()): Promise<void> {
    await db.transaction('rw', [db.skills, db.weeks], async () => {
      const week = await weekRepository.getById(weekId);
      if (!week) return;
      const skills = await skillRepository.getByWeek(weekId);
      if (!canCompleteWeek(week, skills)) throw new WeekNotCompletableError();

      await weekRepository.update(weekId, getCompleteChanges(week, today));
    });
  },

  /** 完成を取り消して「進行中」に戻す。完成していない週には何もしない */
  async reopen(weekId: string): Promise<void> {
    await db.transaction('rw', [db.weeks], async () => {
      const week = await weekRepository.getById(weekId);
      if (!week || week.status !== 'done') return;

      await weekRepository.update(weekId, getReopenChanges());
    });
  },
};
