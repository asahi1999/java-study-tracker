import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSave } from './useAutoSave';

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    setVisibility('visible');
  });

  it('入力が1秒止まったら保存する', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave<string>(save));

    act(() => result.current.schedule('メモ'));
    expect(result.current.status).toBe('pending');

    await act(async () => vi.advanceTimersByTime(999));
    expect(save).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(1));
    expect(save).toHaveBeenCalledWith('メモ');
    expect(result.current.status).toBe('saved');
  });

  it('入力が続いている間は保存せず、最後の値だけを1回保存する', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave<string>(save));

    act(() => result.current.schedule('め'));
    await act(async () => vi.advanceTimersByTime(600));
    act(() => result.current.schedule('めも'));
    await act(async () => vi.advanceTimersByTime(600));
    expect(save).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(400));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('めも');
  });

  it('最初は何も保存せず、状態は idle', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave<string>(save));

    await act(async () => vi.advanceTimersByTime(5000));

    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('画面を離れるときは、待たずにすぐ保存する', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useAutoSave<string>(save));
    act(() => result.current.schedule('途中のメモ'));

    unmount();

    expect(save).toHaveBeenCalledWith('途中のメモ');
  });

  it('タブを裏に回したときも、待たずにすぐ保存する', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave<string>(save));
    act(() => result.current.schedule('途中のメモ'));

    await act(async () => setVisibility('hidden'));

    expect(save).toHaveBeenCalledWith('途中のメモ');
  });

  it('すぐ保存したあとは、同じ値をもう一度保存しない', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave<string>(save));
    act(() => result.current.schedule('メモ'));

    await act(async () => result.current.flush());
    await act(async () => vi.advanceTimersByTime(2000));

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('保存に失敗したら状態を error にする', async () => {
    const save = vi.fn().mockRejectedValue(new Error('書き込めません'));
    const { result } = renderHook(() => useAutoSave<string>(save));

    act(() => result.current.schedule('メモ'));
    await act(async () => vi.advanceTimersByTime(1000));

    expect(result.current.status).toBe('error');
  });

  it('待つ時間を指定できる', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave<string>(save, 200));

    act(() => result.current.schedule('メモ'));
    await act(async () => vi.advanceTimersByTime(200));

    expect(save).toHaveBeenCalledTimes(1);
  });
});
