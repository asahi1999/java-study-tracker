import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { seedIfEmpty } from '@/db/seed';

import { AppRoutes } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  beforeEach(async () => {
    await seedIfEmpty('2026-11-16');
  });

  it.each([
    ['/', 'ダッシュボード'],
    ['/roadmap', 'ロードマップ'],
    ['/roadmap/week-01', '1週目 数当てゲーム'],
    ['/logs', '学習ログ'],
    ['/stats', '統計'],
    ['/badges', '実績バッジ'],
    ['/editor', 'ロードマップ編集'],
    ['/settings', '設定'],
  ])('%s で「%s」の画面を表示する', async (path, heading) => {
    renderAt(path);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('存在しないURLでは404ページを表示し、ダッシュボードへ戻れる', async () => {
    const user = userEvent.setup();
    renderAt('/no-such-page');
    expect(
      screen.getByRole('heading', { level: 1, name: 'ページが見つかりません' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'ダッシュボードへ戻る' }));

    expect(screen.getByRole('heading', { level: 1, name: 'ダッシュボード' })).toBeInTheDocument();
  });

  it('メニューから各画面へ移動できる', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const menu = screen.getByRole('navigation', { name: 'メインメニュー' });

    await user.click(within(menu).getByRole('link', { name: '統計' }));

    // ダッシュボード以外のページは開いたときに読み込むので、表示されるまで待つ
    expect(await screen.findByRole('heading', { level: 1, name: '統計' })).toBeInTheDocument();
  });

  it('路線バーの駅から、その週の詳細へ移動できる', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const rail = await screen.findByRole('navigation', { name: 'ロードマップの現在地' });

    await user.click(within(rail).getByRole('link', { name: /^7週目 SQL練習/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '7週目 SQL練習（単語テーブルの操作）' }),
    ).toBeInTheDocument();
  });

  it('メニューでは現在の画面だけを「現在のページ」として示す', () => {
    renderAt('/roadmap/week-01');
    const menu = screen.getByRole('navigation', { name: 'メインメニュー' });

    expect(within(menu).getByRole('link', { name: 'ロードマップ' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // ダッシュボード（/）はすべてのURLの先頭に一致するが、現在のページ扱いにしない
    expect(within(menu).getByRole('link', { name: 'ダッシュボード' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
