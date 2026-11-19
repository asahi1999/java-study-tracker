import { createInitialRoadmap } from '@/data/initialRoadmap';
import { db } from '@/db/database';
import {
  monthRepository,
  skillRepository,
  stepRepository,
  weekRepository,
} from '@/db/repositories';
import type { MonthInput, StepInput, WeekInput } from '@/lib/editorValidation';
import { getMoveChanges, getNextOrder, type MoveDirection } from '@/lib/reorder';
import { mergeProgressIntoInitial, type RoadmapResetMode } from '@/lib/roadmapReset';
import type { Month, Skill, Step, Week } from '@/types';

// ロードマップ編集の手順。表示順を決めてから書き込むまでを1つのトランザクションにまとめ、
// 別のタブで同時に追加しても order が重ならないようにする

export const roadmapService = {
  /** 月を末尾に足す */
  async addMonth(input: MonthInput): Promise<Month> {
    return db.transaction('rw', [db.months], async () => {
      const months = await monthRepository.getAll();
      return monthRepository.add({ ...input, order: getNextOrder(months) });
    });
  },

  /** ステップを末尾に足す。番号（①②…）は order から付くので、次の番号になる */
  async addStep(input: StepInput): Promise<Step> {
    return db.transaction('rw', [db.steps], async () => {
      const steps = await stepRepository.getAll();
      return stepRepository.add({ ...input, order: getNextOrder(steps) });
    });
  },

  /** 週を末尾に足す。進捗は空の「未着手」から始める */
  async addWeek(input: WeekInput): Promise<Week> {
    return db.transaction('rw', [db.weeks], async () => {
      const weeks = await weekRepository.getAll();
      return weekRepository.add({
        ...input,
        order: getNextOrder(weeks),
        status: 'not_started',
        repoUrl: '',
        startedAt: null,
        completedAt: null,
        memo: '',
      });
    });
  },

  /** 週の表示順を1つ上・下へ動かす。予定日は変わらない（Q13） */
  async moveWeek(id: string, direction: MoveDirection): Promise<void> {
    await db.transaction('rw', [db.weeks], async () => {
      const weeks = await weekRepository.getAll();
      for (const { id: weekId, order } of getMoveChanges(weeks, id, direction)) {
        await weekRepository.update(weekId, { order });
      }
    });
  },

  /** チェック項目を週の末尾に足す */
  async addSkill(weekId: string, label: string): Promise<Skill> {
    return db.transaction('rw', [db.skills], async () => {
      const skills = await skillRepository.getByWeek(weekId);
      return skillRepository.add({
        weekId,
        label,
        order: getNextOrder(skills),
        checked: false,
        checkedAt: null,
      });
    });
  },

  /** チェック項目の表示順を、同じ週の中で1つ上・下へ動かす */
  async moveSkill(id: string, direction: MoveDirection): Promise<void> {
    await db.transaction('rw', [db.skills], async () => {
      const skill = await skillRepository.getById(id);
      if (!skill) return;
      const skills = await skillRepository.getByWeek(skill.weekId);
      for (const { id: skillId, order } of getMoveChanges(skills, id, direction)) {
        await skillRepository.update(skillId, { order });
      }
    });
  },

  /**
   * 初期ロードマップに戻す（Q14）。設定はどちらでも残す。
   * - keep：同じIDの週・項目の進捗を引き継ぐ。追加した週・項目は消え、その週のログは「週の指定なし」にする
   * - erase：進捗に加えて、学習ログとバッジも削除する
   */
  async resetToInitial(mode: RoadmapResetMode): Promise<void> {
    const tables = [db.months, db.steps, db.weeks, db.skills, db.logs, db.badges];
    await db.transaction('rw', tables, async () => {
      const initial = createInitialRoadmap();
      const roadmap =
        mode === 'keep'
          ? mergeProgressIntoInitial(initial, {
              weeks: await db.weeks.toArray(),
              skills: await db.skills.toArray(),
            })
          : initial;

      // 表を丸ごと入れ替えるので、1件ずつの repositories ではなく表をまとめて書き換える
      await Promise.all([db.months.clear(), db.steps.clear(), db.weeks.clear(), db.skills.clear()]);
      await db.months.bulkAdd(roadmap.months);
      await db.steps.bulkAdd(roadmap.steps);
      await db.weeks.bulkAdd(roadmap.weeks);
      await db.skills.bulkAdd(roadmap.skills);

      if (mode === 'keep') {
        // 学習した事実は残し、なくなった週との紐づけだけを外す（週の削除と同じ扱い）
        const weekIds = new Set(roadmap.weeks.map((week) => week.id));
        await db.logs
          .filter((log) => log.weekId !== null && !weekIds.has(log.weekId))
          .modify({ weekId: null });
      } else {
        await Promise.all([db.logs.clear(), db.badges.clear()]);
      }
    });
  },
};
