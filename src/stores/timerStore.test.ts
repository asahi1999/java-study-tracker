import { describe, expect, it } from 'vitest';

import { getElapsedMs } from '@/lib/timer';

import { reloadTimerStore, TIMER_STORAGE_KEY, useTimerStore } from './timerStore';

const MINUTE = 60_000;
const T0 = new Date(2026, 10, 16, 10, 0, 0).getTime();

const store = () => useTimerStore.getState();
const stored = () => JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) ?? 'null');

describe('timerStore', () => {
  it('はじめは止まっている', () => {
    expect(store().status).toBe('idle');
    expect(localStorage.getItem(TIMER_STORAGE_KEY)).toBeNull();
  });

  it('開始すると計測中になり、localStorage に状態を保存する', () => {
    store().start('week-01', T0);

    expect(store()).toMatchObject({ status: 'running', startedAt: T0, weekId: 'week-01' });
    expect(stored()).toEqual({
      status: 'running',
      startedAt: T0,
      resumedAt: T0,
      accumulatedMs: 0,
      weekId: 'week-01',
    });
  });

  it('一時停止と再開をまたいで、経過時間を数える', () => {
    store().start(null, T0);
    store().pause(T0 + 5 * MINUTE);
    expect(store().status).toBe('paused');
    expect(stored().accumulatedMs).toBe(5 * MINUTE);

    store().resume(T0 + 20 * MINUTE);
    expect(store().status).toBe('running');
    expect(getElapsedMs(store(), T0 + 22 * MINUTE)).toBe(7 * MINUTE);
  });

  it('計測中にもう一度開始しても、計測をやり直さない', () => {
    store().start('week-01', T0);
    store().start('week-02', T0 + 10 * MINUTE);

    expect(store()).toMatchObject({ startedAt: T0, weekId: 'week-01' });
  });

  it('計測中に週を選び直せる', () => {
    store().start('week-01', T0);
    store().setWeekId('week-02');
    expect(store().weekId).toBe('week-02');
    expect(stored().weekId).toBe('week-02');

    store().setWeekId(null);
    expect(store().weekId).toBeNull();
  });

  it('止まっているときは、週を選び直しても何も保存しない', () => {
    store().setWeekId('week-02');

    expect(store().weekId).toBeNull();
    expect(localStorage.getItem(TIMER_STORAGE_KEY)).toBeNull();
  });

  it('リセットすると止まっている状態に戻り、保存した状態も消す', () => {
    store().start('week-01', T0);
    store().pause(T0 + MINUTE);

    store().reset();

    expect(store()).toMatchObject({
      status: 'idle',
      startedAt: null,
      resumedAt: null,
      accumulatedMs: 0,
      weekId: null,
    });
    expect(localStorage.getItem(TIMER_STORAGE_KEY)).toBeNull();
  });

  it('保存してある状態を読み直すと、計測を続きから再開できる（再読み込みの再現）', () => {
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        status: 'running',
        startedAt: T0,
        resumedAt: T0,
        accumulatedMs: 0,
        weekId: 'week-03',
      }),
    );

    reloadTimerStore();

    expect(store()).toMatchObject({ status: 'running', weekId: 'week-03' });
    expect(getElapsedMs(store(), T0 + 90 * MINUTE)).toBe(90 * MINUTE);
  });

  it('保存してある状態が壊れていたら、止まっている状態にする', () => {
    localStorage.setItem(TIMER_STORAGE_KEY, '{壊れたデータ');

    reloadTimerStore();

    expect(store().status).toBe('idle');
  });

  it('ほかのタブでタイマーを操作したら、このタブにも反映する', () => {
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        status: 'paused',
        startedAt: T0,
        resumedAt: null,
        accumulatedMs: 3 * MINUTE,
        weekId: null,
      }),
    );

    window.dispatchEvent(new StorageEvent('storage', { key: TIMER_STORAGE_KEY }));

    expect(store()).toMatchObject({ status: 'paused', accumulatedMs: 3 * MINUTE });
  });

  it('ほかのキーの変更には反応しない', () => {
    store().start('week-01', T0);
    localStorage.removeItem(TIMER_STORAGE_KEY);

    window.dispatchEvent(new StorageEvent('storage', { key: 'java-study-tracker:theme' }));

    expect(store().status).toBe('running');
  });
});
