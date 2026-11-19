import type { RoadmapData, Skill, Week } from '@/types';

/** 「初期ロードマップに戻す」で選べる、進捗の扱い */
export type RoadmapResetMode = 'keep' | 'erase';

// 引き継ぐのは、学習した記録にあたる項目だけ。名前や予定（週番号・予定時間）は初期データに戻す
type WeekProgress = Pick<Week, 'status' | 'repoUrl' | 'startedAt' | 'completedAt' | 'memo'>;
type SkillProgress = Pick<Skill, 'checked' | 'checkedAt'>;

function pickWeekProgress({ status, repoUrl, startedAt, completedAt, memo }: Week): WeekProgress {
  return { status, repoUrl, startedAt, completedAt, memo };
}

function pickSkillProgress({ checked, checkedAt }: Skill): SkillProgress {
  return { checked, checkedAt };
}

/**
 * 「残す」を選んで初期ロードマップに戻したときのデータを作る（Q14）。
 * 初期データと同じIDの週・項目は、今の進捗（状態・チェック・URL・メモ・日付）を引き継ぐ。
 * 追加した週・項目は含めない（呼び出し側で削除する）
 */
export function mergeProgressIntoInitial(
  initial: RoadmapData,
  current: Pick<RoadmapData, 'weeks' | 'skills'>,
): RoadmapData {
  const currentWeeks = new Map(current.weeks.map((week) => [week.id, week]));
  const currentSkills = new Map(current.skills.map((skill) => [skill.id, skill]));

  return {
    months: initial.months,
    steps: initial.steps,
    weeks: initial.weeks.map((week) => {
      const kept = currentWeeks.get(week.id);
      return kept ? { ...week, ...pickWeekProgress(kept) } : week;
    }),
    skills: initial.skills.map((skill) => {
      const kept = currentSkills.get(skill.id);
      // 同じIDでも、別の週の項目になっているものは引き継がない
      return kept && kept.weekId === skill.weekId
        ? { ...skill, ...pickSkillProgress(kept) }
        : skill;
    }),
  };
}
