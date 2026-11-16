import { describe, expect, it } from 'vitest';

import { BADGE_DEFINITIONS } from './badges';

describe('BADGE_DEFINITIONS', () => {
  it('仕様どおり16個のバッジがある', () => {
    expect(BADGE_DEFINITIONS).toHaveLength(16);
  });

  it('IDが重複していない', () => {
    const ids = BADGE_DEFINITIONS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('すべてのバッジに名前と条件がある', () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.name).not.toBe('');
      expect(badge.condition).not.toBe('');
    }
  });
});
