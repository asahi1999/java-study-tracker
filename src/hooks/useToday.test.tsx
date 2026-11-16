import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToday } from './useToday';

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('今日の日付を返す', () => {
    vi.setSystemTime(new Date(2026, 10, 18, 9, 0));

    const { result } = renderHook(() => useToday());

    expect(result.current).toBe('2026-11-18');
  });

  it('開いたまま日付が変わったら、新しい日付になる', () => {
    vi.setSystemTime(new Date(2026, 10, 18, 23, 59, 30));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-11-18');

    act(() => vi.advanceTimersByTime(40_000));

    expect(result.current).toBe('2026-11-19');
  });

  it('2日続けて開いたままでも、毎日更新する', () => {
    vi.setSystemTime(new Date(2026, 10, 18, 23, 59, 30));
    const { result } = renderHook(() => useToday());

    act(() => vi.advanceTimersByTime(40_000));
    act(() => vi.advanceTimersByTime(24 * 60 * 60 * 1000));

    expect(result.current).toBe('2026-11-20');
  });

  it('日付が変わる前は更新しない', () => {
    vi.setSystemTime(new Date(2026, 10, 18, 9, 0));
    const { result } = renderHook(() => useToday());

    act(() => vi.advanceTimersByTime(60 * 60 * 1000));

    expect(result.current).toBe('2026-11-18');
  });

  it('タブに戻ってきたときに日付が変わっていれば、新しい日付になる', () => {
    vi.setSystemTime(new Date(2026, 10, 18, 22, 0));
    const { result } = renderHook(() => useToday());

    // 裏にいる間にタイマーが止まっていた場合を再現するため、時計だけを進める
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe('2026-11-20');
  });
});
