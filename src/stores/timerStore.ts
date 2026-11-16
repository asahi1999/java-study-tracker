import { create } from 'zustand';

import {
  IDLE_TIMER,
  parseTimerState,
  pauseTimer,
  resumeTimer,
  startTimer,
  type TimerState,
} from '@/lib/timer';

export const TIMER_STORAGE_KEY = 'java-study-tracker:timer';

type TimerActions = {
  start: (weekId: string | null, now?: number) => void;
  pause: (now?: number) => void;
  resume: (now?: number) => void;
  /** 計測中・一時停止中に、どの週の学習かを選び直す */
  setWeekId: (weekId: string | null) => void;
  /** 計測をやめて、止まっている状態に戻す（保存したあと・破棄するとき） */
  reset: () => void;
};

function readStoredState(): TimerState {
  try {
    return parseTimerState(localStorage.getItem(TIMER_STORAGE_KEY));
  } catch {
    // プライベートブラウズなどで読めない場合は、止まっている状態から始める
    return IDLE_TIMER;
  }
}

function writeStoredState(state: TimerState): void {
  try {
    if (state.status === 'idle') localStorage.removeItem(TIMER_STORAGE_KEY);
    else localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても計測は続ける（再読み込みすると計測が消えるだけ）
  }
}

function pickState({
  status,
  startedAt,
  resumedAt,
  accumulatedMs,
  weekId,
}: TimerState): TimerState {
  return { status, startedAt, resumedAt, accumulatedMs, weekId };
}

/**
 * 学習タイマーの状態。
 * 経過時間そのものは持たず、「開始した時刻」と「一時停止までの累計」だけを持つ。
 * こうすると、ページを再読み込みしても・タブを閉じても、開き直したときに経過時間を計算し直せる
 */
export const useTimerStore = create<TimerState & TimerActions>()((set) => ({
  ...readStoredState(),
  start: (weekId, now = Date.now()) =>
    set((state) => (state.status === 'idle' ? startTimer(weekId, now) : state)),
  pause: (now = Date.now()) => set((state) => pauseTimer(pickState(state), now)),
  resume: (now = Date.now()) => set((state) => resumeTimer(pickState(state), now)),
  setWeekId: (weekId) => set((state) => (state.status === 'idle' ? state : { weekId })),
  reset: () => set(IDLE_TIMER),
}));

// 状態が変わるたびに localStorage へ写す
useTimerStore.subscribe((state) => writeStoredState(pickState(state)));

// ほかのタブでタイマーを操作したら、このタブにも反映する。
// タブごとに別々の計測が走って、同じ時間を二重に記録するのを防ぐため
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== TIMER_STORAGE_KEY) return;
    useTimerStore.setState(readStoredState());
  });
}

/** 保存してある状態を読み直す（テスト用） */
export function reloadTimerStore(): void {
  useTimerStore.setState(readStoredState());
}
