import type { StudyLog, Week } from '@/types';

/** 週の絞り込みで「週の指定なし」のログを選ぶときの値 */
export const NO_WEEK = 'none';

export type LogFilter = {
  /** この日以降（YYYY-MM-DD）。空文字は指定なし */
  from: string;
  /** この日以前（YYYY-MM-DD）。空文字は指定なし */
  to: string;
  /** 週のID。NO_WEEK は「週の指定なし」のログ。空文字は指定なし */
  weekId: string;
  /** ステップのID。空文字は指定なし */
  stepId: string;
};

export const EMPTY_LOG_FILTER: LogFilter = { from: '', to: '', weekId: '', stepId: '' };

export function isLogFilterEmpty(filter: LogFilter): boolean {
  return Object.values(filter).every((value) => value === '');
}

/** 条件に合う学習ログだけを返す。並び順は変えない。指定した条件はすべて満たす必要がある */
export function filterLogs(
  logs: readonly StudyLog[],
  filter: LogFilter,
  weeks: readonly Pick<Week, 'id' | 'stepId'>[],
): StudyLog[] {
  const stepByWeek = new Map(weeks.map((week) => [week.id, week.stepId]));

  return logs.filter((log) => {
    if (filter.from && log.date < filter.from) return false;
    if (filter.to && log.date > filter.to) return false;
    if (filter.weekId === NO_WEEK && log.weekId !== null) return false;
    if (filter.weekId && filter.weekId !== NO_WEEK && log.weekId !== filter.weekId) return false;
    if (filter.stepId && (log.weekId === null || stepByWeek.get(log.weekId) !== filter.stepId)) {
      return false;
    }
    return true;
  });
}
