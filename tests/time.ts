import { vi } from 'vitest';

/**
 * 「今日」を指定した日付に固定する（時刻は正午）。
 * 日付だけを固定し、タイマーは本物のまま動かす。
 * IndexedDB の代用（fake-indexeddb）がタイマーを使って動いているため、タイマーまで止めると読み書きが終わらなくなる
 */
export function setToday(date: string): void {
  const [year, month, day] = date.split('-').map(Number);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, 12, 0, 0));
}
