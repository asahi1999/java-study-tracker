import { z } from 'zod';

import { toDateString } from './date';
import type { WeekView } from './weekView';

// 学習タイマーの計算。時刻はすべて引数で受け取り、ここでは現在時刻を読まない（テストしやすくするため）

/** idle: 止まっている / running: 計測中 / paused: 一時停止中 */
export type TimerStatus = 'idle' | 'running' | 'paused';

export type TimerState = {
  status: TimerStatus;
  /** 最初に「開始」を押した時刻（ミリ秒）。記録する日付はこの時刻で決める */
  startedAt: number | null;
  /** いま計測している区間が始まった時刻（ミリ秒）。一時停止中は null */
  resumedAt: number | null;
  /** 一時停止までに計測した累計（ミリ秒） */
  accumulatedMs: number;
  /** どの週の学習か。null は「週の指定なし」 */
  weekId: string | null;
};

export const IDLE_TIMER: TimerState = {
  status: 'idle',
  startedAt: null,
  resumedAt: null,
  accumulatedMs: 0,
  weekId: null,
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
/** 1件のログに記録できる上限（24時間） */
export const MAX_LOG_MINUTES = 1440;

export function startTimer(weekId: string | null, now: number): TimerState {
  return { status: 'running', startedAt: now, resumedAt: now, accumulatedMs: 0, weekId };
}

/** 経過時間（ミリ秒）。一時停止中は、止めた時点の値のまま変わらない */
export function getElapsedMs(state: TimerState, now: number): number {
  if (state.status === 'running' && state.resumedAt !== null) {
    // 端末の時計が巻き戻っても、経過時間がマイナスにならないようにする
    return state.accumulatedMs + Math.max(0, now - state.resumedAt);
  }
  return state.accumulatedMs;
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', resumedAt: null, accumulatedMs: getElapsedMs(state, now) };
}

export function resumeTimer(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running', resumedAt: now };
}

/** 経過時間を、ログに記録する分に直す。秒は切り捨て、24時間を超えた分は切り詰める */
export function toLogMinutes(elapsedMs: number): { minutes: number; capped: boolean } {
  const minutes = Math.max(0, Math.floor(elapsedMs / MS_PER_MINUTE));
  return minutes > MAX_LOG_MINUTES
    ? { minutes: MAX_LOG_MINUTES, capped: true }
    : { minutes, capped: false };
}

/** 記録する日付。日付をまたいで計測しても、開始した日の日付にする。計測していなければ today を返す */
export function getTimerLogDate(state: TimerState, today: string): string {
  return state.startedAt === null ? today : toDateString(new Date(state.startedAt));
}

/** 経過時間を「00:05:09」の形にする（時:分:秒）。100時間以上は時の桁が増える */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / MS_PER_SECOND));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

const timerStateSchema = z
  .object({
    status: z.enum(['idle', 'running', 'paused']),
    startedAt: z.number().nullable(),
    resumedAt: z.number().nullable(),
    accumulatedMs: z.number().min(0),
    weekId: z.string().nullable(),
  })
  // 状態と時刻の組み合わせが合わないものは、壊れたデータとして扱う
  .refine(
    (state) =>
      state.status === 'idle' ||
      (state.startedAt !== null && (state.status === 'paused' || state.resumedAt !== null)),
  );

/**
 * 保存しておいたタイマーの状態を読み戻す。
 * 保存先（localStorage）は利用者が書き換えられるので、形が正しくなければ「止まっている」状態に戻す
 */
export function parseTimerState(raw: string | null): TimerState {
  if (raw === null) return IDLE_TIMER;
  try {
    const result = timerStateSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.status === 'idle') return IDLE_TIMER;
    return result.data;
  } catch {
    return IDLE_TIMER;
  }
}

/**
 * タイマーで選ぶ週の初期値。
 * 現在の週のうち、表示順が先の未完成の週にする。なければ、次に取り組む未完成の週にする。
 * すべて完成している・週がないときは null（週の指定なし）
 */
export function pickDefaultWeekId(views: readonly WeekView[]): string | null {
  const unfinished = [...views]
    .sort((a, b) => a.week.order - b.week.order)
    .filter(({ week }) => week.status !== 'done');
  return (unfinished.find(({ isCurrent }) => isCurrent) ?? unfinished[0])?.week.id ?? null;
}
