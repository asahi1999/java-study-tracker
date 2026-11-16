import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { BottomNav } from './BottomNav';

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
      <Routes>
        <Route path="/" element={<p>ダッシュボードの画面</p>} />
        <Route path="/settings" element={<p>設定の画面</p>} />
        <Route path="*" element={<p>ほかの画面</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('よく使う4画面と「その他」をタブに並べる', () => {
    renderNav();
    const tabs = screen.getByRole('navigation', { name: 'タブメニュー' });

    expect(
      within(tabs)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['ダッシュボード', 'ロードマップ', '学習ログ', '統計']);
    expect(within(tabs).getByRole('button', { name: 'その他' })).toBeInTheDocument();
  });

  it('現在の画面のタブを「現在のページ」として示す', () => {
    renderNav('/');
    const tabs = screen.getByRole('navigation', { name: 'タブメニュー' });

    expect(within(tabs).getByRole('link', { name: 'ダッシュボード' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(tabs).getByRole('link', { name: '統計' })).not.toHaveAttribute('aria-current');
  });

  it('「その他」を押すと、残りの3画面へのメニューを開く', async () => {
    const user = userEvent.setup();
    renderNav();
    const moreButton = screen.getByRole('button', { name: 'その他' });
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(moreButton);

    const menu = screen.getByRole('dialog', { name: 'その他' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['実績バッジ', 'ロードマップ編集', '設定']);
    expect(moreButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('メニューから画面を選ぶと、移動してメニューを閉じる', async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole('button', { name: 'その他' }));

    await user.click(screen.getByRole('link', { name: '設定' }));

    expect(screen.getByText('設定の画面')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('閉じるボタンでメニューを閉じる', async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole('button', { name: 'その他' }));

    await user.click(screen.getByRole('button', { name: '閉じる' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('ダッシュボードの画面')).toBeInTheDocument();
  });
});
