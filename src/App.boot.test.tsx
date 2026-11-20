import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BootstrapState } from '@/hooks/useAppBootstrap';

import App from './App';

// 起動時の準備の状態を、テストごとに切り替える
const bootstrap = vi.hoisted(() => ({ state: { status: 'loading' } as BootstrapState }));
vi.mock('@/hooks/useAppBootstrap', () => ({ useAppBootstrap: () => bootstrap.state }));

beforeEach(() => {
  window.location.hash = '';
});

describe('App', () => {
  it('準備が終わるまでは、読み込み中の画面を出す', () => {
    bootstrap.state = { status: 'loading' };
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('読み込み中…');
  });

  it('データベースを開けなければ、理由と再読み込みのボタンを出す', () => {
    bootstrap.state = { status: 'error', message: 'IndexedDB を開けません' };
    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent('IndexedDB を開けません');
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
  });

  it('準備ができたら、URL の # 以降に合わせた画面を出す', async () => {
    bootstrap.state = { status: 'ready' };
    window.location.hash = '#/settings';
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: '設定' })).toBeInTheDocument();
  });
});
