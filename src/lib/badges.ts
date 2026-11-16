import type { BadgeDefinition } from '@/data/badges';
import type { EarnedBadge } from '@/types';

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
