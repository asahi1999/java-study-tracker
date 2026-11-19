export type MoveDirection = 'up' | 'down';

type Ordered = { id: string; order: number };

/** 書き換える表示順（id と新しい order） */
export type OrderChange = { id: string; order: number };

/**
 * 指定した要素を1つ上（前）または下（後ろ）へ動かしたときの、表示順の書き換えを返す。
 * 端の要素で動けないときや、見つからないときは空の配列を返す。
 *
 * 入れ替えた2つだけでなく、全体の order を1から振り直す。
 * 削除や古いデータで order が飛んでいたり重なっていたりしても、必ず1つずつ動くようにするため
 */
export function getMoveChanges(
  items: readonly Ordered[],
  id: string,
  direction: MoveDirection,
): OrderChange[] {
  // order が同じものは、もとの並びのまま扱う（sort は安定ソート）
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((item) => item.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= sorted.length) return [];

  const moved = [...sorted];
  [moved[index], moved[target]] = [moved[target]!, moved[index]!];

  return moved.flatMap((item, position) =>
    item.order === position + 1 ? [] : [{ id: item.id, order: position + 1 }],
  );
}

/** 末尾に足すときの表示順（今ある最大の order の次） */
export function getNextOrder(items: readonly Pick<Ordered, 'order'>[]): number {
  return items.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}
