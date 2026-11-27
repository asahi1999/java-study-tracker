// 先読み（設計書 4-10）。ホームの表示が終わってから、手が空いたときに Java の準備を始める
import type { JavaRunner } from './JavaRunner.ts';

type IdleWindow = {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** 準備を予約する。戻り値で取り消せる。非対応と分かっていれば何もしない */
export function schedulePrefetch(
  runner: JavaRunner,
  win: Window & IdleWindow = window,
): () => void {
  if (runner.status === 'unsupported') return () => {};
  if (win.requestIdleCallback) {
    const id = win.requestIdleCallback(() => void runner.prepare(), { timeout: 5000 });
    return () => win.cancelIdleCallback?.(id);
  }
  const id = win.setTimeout(() => void runner.prepare(), 1500);
  return () => win.clearTimeout(id);
}
