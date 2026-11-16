import { useSyncExternalStore } from 'react';

import { todayString } from '@/lib/date';

/** 次に日付が変わるまでのミリ秒 */
function msUntilTomorrow(now: Date = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.getTime() - now.getTime();
}

function subscribe(onChange: () => void): () => void {
  let timer: number;

  // 日付が変わった直後に知らせる。その後は、また次の0時を待つ
  const waitForMidnight = () => {
    timer = window.setTimeout(() => {
      onChange();
      waitForMidnight();
    }, msUntilTomorrow() + 1000);
  };
  waitForMidnight();

  // スマホでは裏にいる間タイマーが止まることがあるので、画面に戻ってきたときにも確かめる
  document.addEventListener('visibilitychange', onChange);

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onChange);
  };
}

/**
 * 今日の日付（YYYY-MM-DD）。アプリを開いたまま日付が変わったら、新しい日付で再描画する。
 * 予定日との比較（現在の週・遅れ）が、前の日のまま残らないようにするため
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, todayString);
}
