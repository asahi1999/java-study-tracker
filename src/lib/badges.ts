import type { BadgeDefinition } from '@/data/badges';
import type { EarnedBadge, Settings, StudyLog, Week } from '@/types';

import { getPlannedRange } from './schedule';
import { sumMinutes } from './stats';
import { getLongestStreak } from './streak';

/** 獲得したバッジ（定義と獲得した日時を合わせたもの） */
export type EarnedBadgeView = BadgeDefinition & { earnedAt: string };

/**
 * 獲得したバッジを新しい順に並べ、定義（名前・条件）を付けて返す。
 * 定義にないIDは除く（古いデータに、今はないバッジが残っていても画面が壊れないようにするため）
 */
export function getRecentBadges(
  earned: readonly EarnedBadge[],
  definitions: readonly BadgeDefinition[],
  limit: number = Infinity,
): EarnedBadgeView[] {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));

  return [...earned]
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
    .flatMap(({ id, earnedAt }) => {
      const definition = byId.get(id);
      return definition ? [{ ...definition, earnedAt }] : [];
    })
    .slice(0, limit);
}

/** バッジの判定に使うデータ */
export type BadgeInput = {
  weeks: readonly Week[];
  logs: readonly Pick<StudyLog, 'date' | 'minutes'>[];
  settings: Pick<Settings, 'startDate' | 'breakPeriods'>;
};

const MINUTES_PER_HOUR = 60;
const REPO_BADGE_COUNT = 5;

/** 指定した週がすべて完成しているか。週が1つもなければ false（達成したことにしない） */
function allDone(weeks: readonly Week[]): boolean {
  return weeks.length > 0 && weeks.every((week) => week.status === 'done');
}

/**
 * いずれかの月で、すべての週が完成していて、どの週も予定終了日までに完成したか（Q10）。
 * 完了日が入っていない週は、予定どおりかどうか分からないので満たさないものとする
 */
function hasOnTimeMonth({ weeks, settings }: BadgeInput): boolean {
  const monthIds = new Set(weeks.map((week) => week.monthId));
  return [...monthIds].some((monthId) => {
    const monthWeeks = weeks.filter((week) => week.monthId === monthId);
    return (
      allDone(monthWeeks) &&
      monthWeeks.every(
        (week) =>
          week.completedAt !== null && week.completedAt <= getPlannedRange(week, settings).end,
      )
    );
  });
}

/**
 * 初期データの固定IDの月・ステップと、それで判定するバッジのID（Q12）。
 * ロードマップ編集で月・ステップを削除するときに、獲得できなくなるバッジを知らせるために使う
 */
export const FIXED_TARGET_BADGE_IDS: Readonly<Record<string, string>> = {
  'month-1': 'month-1',
  'month-2': 'month-2',
  'step-4': 'oop',
  'step-5': 'sql',
  'step-6': 'spring',
};

/** バッジのIDごとの条件。月・ステップのバッジは、初期データの固定IDで判定する（Q12） */
const CONDITIONS: Record<string, (input: BadgeInput) => boolean> = {
  'first-log': ({ logs }) => logs.length > 0,
  'first-done': ({ weeks }) => weeks.some((week) => week.status === 'done'),
  // 連続学習の日数は、いまの連続ではなく最長記録で判定する（Q12）
  'streak-3': ({ logs }) => getLongestStreak(logs) >= 3,
  'streak-7': ({ logs }) => getLongestStreak(logs) >= 7,
  'streak-30': ({ logs }) => getLongestStreak(logs) >= 30,
  'hours-10': ({ logs }) => sumMinutes(logs) >= 10 * MINUTES_PER_HOUR,
  'hours-50': ({ logs }) => sumMinutes(logs) >= 50 * MINUTES_PER_HOUR,
  'hours-100': ({ logs }) => sumMinutes(logs) >= 100 * MINUTES_PER_HOUR,
  'month-1': ({ weeks }) => allDone(weeks.filter((week) => week.monthId === 'month-1')),
  'month-2': ({ weeks }) => allDone(weeks.filter((week) => week.monthId === 'month-2')),
  oop: ({ weeks }) => allDone(weeks.filter((week) => week.stepId === 'step-4')),
  sql: ({ weeks }) => allDone(weeks.filter((week) => week.stepId === 'step-5')),
  spring: ({ weeks }) => allDone(weeks.filter((week) => week.stepId === 'step-6')),
  // 同じURLでも、週ごとに1つと数える（Q11）
  'repo-5': ({ weeks }) => weeks.filter((week) => week.repoUrl !== '').length >= REPO_BADGE_COUNT,
  'on-time': hasOnTimeMonth,
  complete: ({ weeks }) => allDone(weeks),
};

/** いまの条件を満たしているバッジのID */
export function evaluateBadges(input: BadgeInput): Set<string> {
  return new Set(
    Object.entries(CONDITIONS)
      .filter(([, condition]) => condition(input))
      .map(([id]) => id),
  );
}

/**
 * 条件を満たしているのに、まだ獲得していないバッジのID（定義の順）。
 * 一度獲得したバッジは、条件を満たさなくなっても消さないので、ここでは「足す」ものだけを返す
 */
export function getNewBadgeIds(
  satisfied: ReadonlySet<string>,
  earned: readonly EarnedBadge[],
  definitions: readonly BadgeDefinition[],
): string[] {
  const earnedIds = new Set(earned.map((badge) => badge.id));
  return definitions
    .map((definition) => definition.id)
    .filter((id) => satisfied.has(id) && !earnedIds.has(id));
}
