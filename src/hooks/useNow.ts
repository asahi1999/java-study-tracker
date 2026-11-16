import { useEffect, useState } from 'react';

/**
 * 現在時刻（ミリ秒）。active の間、一定の間隔で新しい時刻にして再描画する。
 * 学習タイマーの経過時間を、1秒ごとに表示し直すために使う
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);

  return now;
}
