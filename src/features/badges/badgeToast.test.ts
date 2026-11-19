import { describe, expect, it } from 'vitest';

import { createBadgeToast } from './badgeToast';

describe('createBadgeToast', () => {
  it('1個なら、名前と条件を知らせる', () => {
    expect(createBadgeToast(['first-log'])).toMatchObject({
      title: 'バッジを獲得しました',
      description: '「はじめの一歩」初めて学習ログを記録',
      action: { label: '実績バッジを見る', to: '/badges' },
    });
  });

  it('複数なら、1つの通知にまとめて個数と名前を知らせる', () => {
    expect(createBadgeToast(['first-log', 'first-done', 'streak-3'])).toMatchObject({
      title: 'バッジを3個獲得しました',
      description: '「はじめの一歩」「初完成」「三日坊主卒業」',
    });
  });
});
