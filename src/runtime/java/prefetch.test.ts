import { describe, expect, it, vi } from 'vitest';

import { createFakeRunner } from './fakeRunner.ts';
import { schedulePrefetch } from './prefetch.ts';

describe('schedulePrefetch（設計書 4-10）', () => {
  it('requestIdleCallback で準備を始め、取り消せる', () => {
    const runner = createFakeRunner({ status: 'idle' });
    let cb: (() => void) | null = null;
    const cancel = vi.fn();
    const win = {
      requestIdleCallback: (f: () => void) => {
        cb = f;
        return 7;
      },
      cancelIdleCallback: cancel,
    } as unknown as Window;
    const stop = schedulePrefetch(runner, win);
    expect(runner.prepareCount).toBe(0);
    (cb as unknown as () => void)();
    expect(runner.prepareCount).toBe(1);
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('requestIdleCallback が無ければ 1.5秒後', () => {
    vi.useFakeTimers();
    const runner = createFakeRunner({ status: 'idle' });
    schedulePrefetch(runner, window);
    vi.advanceTimersByTime(1499);
    expect(runner.prepareCount).toBe(0);
    vi.advanceTimersByTime(1);
    expect(runner.prepareCount).toBe(1);
  });

  it('非対応と分かっていれば何もしない', () => {
    const runner = createFakeRunner({ status: 'unsupported' });
    const win = { requestIdleCallback: vi.fn() } as unknown as Window;
    schedulePrefetch(runner, win);
    expect(win.requestIdleCallback).not.toHaveBeenCalled();
  });
});
