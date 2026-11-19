import { describe, expect, it } from 'vitest';

import { getMoveChanges, getNextOrder } from './reorder';

const items = [
  { id: 'a', order: 1 },
  { id: 'b', order: 2 },
  { id: 'c', order: 3 },
];

describe('getMoveChanges', () => {
  it('上へ動かすと、1つ前の要素と入れ替わる', () => {
    expect(getMoveChanges(items, 'b', 'up')).toEqual([
      { id: 'b', order: 1 },
      { id: 'a', order: 2 },
    ]);
  });

  it('下へ動かすと、1つ後ろの要素と入れ替わる', () => {
    expect(getMoveChanges(items, 'b', 'down')).toEqual([
      { id: 'c', order: 2 },
      { id: 'b', order: 3 },
    ]);
  });

  it('端の要素は、それ以上動かない', () => {
    expect(getMoveChanges(items, 'a', 'up')).toEqual([]);
    expect(getMoveChanges(items, 'c', 'down')).toEqual([]);
  });

  it('見つからないIDは何もしない', () => {
    expect(getMoveChanges(items, 'x', 'up')).toEqual([]);
  });

  it('配列の並びではなく order の順で考える', () => {
    const shuffled = [items[2]!, items[0]!, items[1]!];
    expect(getMoveChanges(shuffled, 'c', 'up')).toEqual([
      { id: 'c', order: 2 },
      { id: 'b', order: 3 },
    ]);
  });

  it('order が飛んでいても、1つずつ動き、全体を1から振り直す', () => {
    const gapped = [
      { id: 'a', order: 2 },
      { id: 'b', order: 5 },
      { id: 'c', order: 9 },
    ];
    expect(getMoveChanges(gapped, 'c', 'up')).toEqual([
      { id: 'a', order: 1 },
      { id: 'c', order: 2 },
      { id: 'b', order: 3 },
    ]);
  });

  it('order が重なっていても、動かした分だけ順番が変わる', () => {
    const duplicated = [
      { id: 'a', order: 1 },
      { id: 'b', order: 1 },
    ];
    expect(getMoveChanges(duplicated, 'b', 'up')).toEqual([{ id: 'a', order: 2 }]);
  });
});

describe('getNextOrder', () => {
  it('いちばん大きい order の次を返す', () => {
    expect(getNextOrder([{ order: 3 }, { order: 7 }, { order: 5 }])).toBe(8);
  });

  it('1件もなければ1', () => {
    expect(getNextOrder([])).toBe(1);
  });
});
