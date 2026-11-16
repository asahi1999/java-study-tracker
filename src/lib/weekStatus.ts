import type { Skill, StudyLog, Week } from '@/types';

/** 週の状態を変えるときに書き換える項目 */
export type WeekStatusChanges = Partial<Pick<Week, 'status' | 'startedAt' | 'completedAt'>>;

type WeekState = Pick<Week, 'id' | 'status' | 'startedAt'>;

/**
 * 未着手の週を「進行中」にするための変更内容を返す。変える必要がなければ null。
 * チェック済みの項目が1つ以上、または学習ログが1件以上あれば、手をつけたとみなす。
 * 逆方向（進行中 → 未着手）には自動で戻さない
 */
export function getAutoStartChanges(
  week: WeekState,
  skills: readonly Skill[],
  logs: readonly StudyLog[],
  today: string,
): WeekStatusChanges | null {
  if (week.status !== 'not_started') return null;

  const checkedSkills = skills.filter((skill) => skill.weekId === week.id && skill.checked);
  const weekLogs = logs.filter((log) => log.weekId === week.id);
  if (checkedSkills.length === 0 && weekLogs.length === 0) return null;

  // 開始日は「最初に手をつけた日」にする。あとから過去の日付でログを足した場合も、その日付になる。
  // 未来の日付の記録があっても、開始日が今日より先にならないよう今日を上限にする
  const evidenceDates = [
    ...checkedSkills.map((skill) => skill.checkedAt),
    ...weekLogs.map((log) => log.date),
  ].filter((date): date is string => date !== null);
  const firstDate = [...evidenceDates, today].sort()[0] ?? today;

  return {
    status: 'in_progress',
    startedAt: week.startedAt ?? firstDate,
  };
}

/**
 * 「完成にする」を押せるか。チェック項目がすべてチェック済みのときだけ押せる。
 * 項目が0件の週は、チェックするものがないので押せる
 */
export function canCompleteWeek(week: WeekState, skills: readonly Skill[]): boolean {
  if (week.status === 'done') return false;
  return skills.filter((skill) => skill.weekId === week.id).every((skill) => skill.checked);
}

/** 週を「完成」にするための変更内容 */
export function getCompleteChanges(week: WeekState, today: string): WeekStatusChanges {
  return {
    status: 'done',
    completedAt: today,
    // 項目もログもない週をそのまま完成にした場合でも、開始日が空のままにならないようにする
    startedAt: week.startedAt ?? today,
  };
}

/** 完成を取り消すための変更内容。「進行中」に戻し、完了日を消す */
export function getReopenChanges(): WeekStatusChanges {
  return { status: 'in_progress', completedAt: null };
}

/** チェックリストを変更できない状態か。完成中は、取り消すまでチェックを変えられない */
export function isChecklistLocked(week: Pick<Week, 'status'>): boolean {
  return week.status === 'done';
}
