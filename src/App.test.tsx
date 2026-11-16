import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  it.each([
    ['/', 'ダッシュボード'],
    ['/roadmap', 'ロードマップ'],
    ['/roadmap/week-01', '週の詳細'],
    ['/logs', '学習ログ'],
    ['/stats', '統計'],
    ['/badges', '実績バッジ'],
    ['/editor', 'ロードマップ編集'],
    ['/settings', '設定'],
  ])('%s で「%s」の画面を表示する', (path, heading) => {
    renderAt(path);

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { level: 1, name: '統計' })).toBeInTheDocument();
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
