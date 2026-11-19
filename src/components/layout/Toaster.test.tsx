import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useToastStore } from '@/stores/toastStore';

import { TOAST_DURATION_MS, Toaster } from './Toaster';

function renderToaster() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<p>ダッシュボードの画面</p>} />
        <Route path="/badges" element={<p>実績バッジの画面</p>} />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  );
}

const show = (title = 'バッジを獲得しました') =>
  act(() => {
    useToastStore.getState().show({
      title,
      description: '「はじめの一歩」初めて学習ログを記録',
      action: { label: '実績バッジを見る', to: '/badges' },
    });
  });

describe('Toaster', () => {
  it('通知の領域は、通知が出る前から読み上げの対象として置いておく', () => {
    renderToaster();

    const region = screen.getByRole('region', { name: '通知' });
    expect(region.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('見出し・説明・移動のリンクを表示する', () => {
    renderToaster();
    show();

    const region = screen.getByRole('region', { name: '通知' });
    expect(region).toHaveTextContent('バッジを獲得しました');
    expect(region).toHaveTextContent('「はじめの一歩」初めて学習ログを記録');
    expect(within(region).getByRole('link', { name: '実績バッジを見る' })).toHaveAttribute(
      'href',
      '/badges',
    );
  });

  it('リンクを押すと、その画面へ移って通知を閉じる', () => {
    renderToaster();
    show();

    fireEvent.click(screen.getByRole('link', { name: '実績バッジを見る' }));

    expect(screen.getByText('実績バッジの画面')).toBeInTheDocument();
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('「通知を閉じる」で閉じる', () => {
    renderToaster();
    show();

    fireEvent.click(screen.getByRole('button', { name: '通知を閉じる' }));

    expect(screen.queryByText('バッジを獲得しました')).not.toBeInTheDocument();
  });

  it('一定時間で自動的に消える', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderToaster();
    show();

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByText('バッジを獲得しました')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('バッジを獲得しました')).not.toBeInTheDocument();
  });

  it('カーソルを合わせている間は消えず、離すとまた数え始める', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderToaster();
    show();
    const toast = screen.getByRole('listitem');

    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 3));
    expect(screen.getByText('バッジを獲得しました')).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
    expect(screen.queryByText('バッジを獲得しました')).not.toBeInTheDocument();
  });

  it('フォーカスがある間は消えない', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderToaster();
    show();

    act(() => screen.getByRole('link', { name: '実績バッジを見る' }).focus());
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 2));

    expect(screen.getByText('バッジを獲得しました')).toBeInTheDocument();
  });

  it('同時に出しておくのは3件までで、古いものから消す', () => {
    renderToaster();
    for (const title of ['1件目', '2件目', '3件目', '4件目']) show(title);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('2件目');
    expect(items[2]).toHaveTextContent('4件目');
  });
});
