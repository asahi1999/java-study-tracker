import type { Skill, Week } from '@/types';

export type Progress = {
  /** チェック済みの項目数 */
  checked: number;
  /** 全項目数 */
  total: number;
  /** 進捗率（0〜100の整数） */
  percent: number;
};

/**
 * 進捗率を整数のパーセントにする。
 * 単純に四捨五入すると、39/40 が「100%」、1/400 が「0%」と表示されてしまう。
 * 「100% は全部終わったときだけ」「0% は1つも終わっていないときだけ」になるように端を調整する
 */
function toPercent(checked: number, total: number): number {
  if (total === 0 || checked === 0) return 0;
  if (checked >= total) return 100;
  return Math.min(99, Math.max(1, Math.round((checked / total) * 100)));
}

/** チェック項目の一覧から進捗を計算する。項目が0件なら 0% */
export function calcProgress(skills: readonly Pick<Skill, 'checked'>[]): Progress {
  const total = skills.length;
  const checked = skills.filter((skill) => skill.checked).length;
  return { checked, total, percent: toPercent(checked, total) };
}

/** 全体の進捗 */
export function getOverallProgress(skills: readonly Skill[]): Progress {
  return calcProgress(skills);
}

/** 週ごとの進捗 */
export function getWeekProgress(weekId: string, skills: readonly Skill[]): Progress {
  return calcProgress(skills.filter((skill) => skill.weekId === weekId));
}

/** 指定した週たちに属する項目だけで進捗を計算する */
function getProgressOfWeeks(weeks: readonly Week[], skills: readonly Skill[]): Progress {
  const weekIds = new Set(weeks.map((week) => week.id));
  return calcProgress(skills.filter((skill) => weekIds.has(skill.weekId)));
}

/** 月ごとの進捗（その月に属する週の項目をまとめて数える） */
export function getMonthProgress(
  monthId: string,
  weeks: readonly Week[],
  skills: readonly Skill[],
): Progress {
  return getProgressOfWeeks(
    weeks.filter((week) => week.monthId === monthId),
    skills,
  );
}

/** ステップごとの進捗（そのステップに属する週の項目をまとめて数える） */
export function getStepProgress(
  stepId: string,
  weeks: readonly Week[],
  skills: readonly Skill[],
): Progress {
  return getProgressOfWeeks(
    weeks.filter((week) => week.stepId === stepId),
    skills,
  );
}
