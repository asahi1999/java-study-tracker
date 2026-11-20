import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { seedIfEmpty } from '@/db/seed';

import { useAppBootstrap } from './useAppBootstrap';

// 初期データの投入の成功・失敗を、テストごとに切り替える
vi.mock('@/db/seed', () => ({ seedIfEmpty: vi.fn() }));
vi.mock('@/db/persistence', () => ({ requestPersistentStorage: vi.fn(async () => true) }));

const seed = vi.mocked(seedIfEmpty);

beforeEach(() => {
  seed.mockReset();
});

describe('useAppBootstrap', () => {
  it('準備が終わるまでは loading、終わったら ready になる', async () => {
    seed.mockResolvedValue(true);
    const { result } = renderHook(() => useAppBootstrap());

    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current).toEqual({ status: 'ready' }));
    expect(seed).toHaveBeenCalledOnce();
  });

  it('データベースを開けなければ、エラーの内容を返す', async () => {
    seed.mockRejectedValue(new Error('IndexedDB を開けません'));
    const { result } = renderHook(() => useAppBootstrap());

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'error', message: 'IndexedDB を開けません' }),
    );
  });

  it('Error 以外で失敗しても、文字にして返す', async () => {
    seed.mockRejectedValue('quota exceeded');
    const { result } = renderHook(() => useAppBootstrap());

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'error', message: 'quota exceeded' }),
    );
  });
});
