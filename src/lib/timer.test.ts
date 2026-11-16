import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';

import {
  formatElapsed,
  getElapsedMs,
  getTimerLogDate,
  IDLE_TIMER,
  parseTimerState,
  pauseTimer,
  pickDefaultWeekId,
  resumeTimer,
  startTimer,
  type TimerState,
  toLogMinutes,
} from './timer';
import { buildWeekViews } from './weekView';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
// 計算の基準にする時刻（ローカル時刻の 2026-11-16 10:00）
const T0 = new Date(2026, 10, 16, 10, 0, 0).getTime();

describe('startTimer', () => {
  it('計測中になり、開始した時刻と週を持つ', () => {
    expect(startTimer('week-01', T0)).toEqual({
      status: 'running',
      startedAt: T0,
      resumedAt: T0,
      accumulatedMs: 0,
      weekId: 'week-01',
    });
  });

  it('週を選ばずに始められる', () => {
    expect(startTimer(null, T0).weekId).toBeNull();
  });
});

describe('getElapsedMs', () => {
  it('止まっているときは 0', () => {
    expect(getElapsedMs(IDLE_TIMER, T0)).toBe(0);
  });

  it('計測中は、開始からの時間を返す', () => {
    expect(getElapsedMs(startTimer(null, T0), T0 + 5 * MINUTE)).toBe(5 * MINUTE);
  });

  it('一時停止中は、時間がたっても変わらない', () => {
    const paused = pauseTimer(startTimer(null, T0), T0 + 5 * MINUTE);

    expect(getElapsedMs(paused, T0 + 2 * HOUR)).toBe(5 * MINUTE);
  });

  it('再開すると、一時停止までの時間に続けて数える', () => {
    const paused = pauseTimer(startTimer(null, T0), T0 + 5 * MINUTE);
    const resumed = resumeTimer(paused, T0 + 30 * MINUTE);

    // 5分計測 → 25分休み → 再開して3分
    expect(getElapsedMs(resumed, T0 + 33 * MINUTE)).toBe(8 * MINUTE);
  });

  it('時計が巻き戻っても、マイナスにならない', () => {
    expect(getElapsedMs(startTimer(null, T0), T0 - HOUR)).toBe(0);
  });
});

describe('pauseTimer / resumeTimer', () => {
  it('一時停止すると、そこまでの時間を累計に入れる', () => {
    const paused = pauseTimer(startTimer('week-01', T0), T0 + 90 * SECOND);

    expect(paused).toEqual({
      status: 'paused',
      startedAt: T0,
      resumedAt: null,
      accumulatedMs: 90 * SECOND,
      weekId: 'week-01',
    });
  });

  it('再開しても、最初に開始した時刻は変えない', () => {
    const resumed = resumeTimer(pauseTimer(startTimer(null, T0), T0 + MINUTE), T0 + HOUR);

    expect(resumed.status).toBe('running');
    expect(resumed.startedAt).toBe(T0);
    expect(resumed.resumedAt).toBe(T0 + HOUR);
  });

  it('計測中でなければ、一時停止しても何も変わらない', () => {
    expect(pauseTimer(IDLE_TIMER, T0)).toBe(IDLE_TIMER);
  });

  it('一時停止中でなければ、再開しても何も変わらない', () => {
    const running = startTimer(null, T0);

    expect(resumeTimer(running, T0 + MINUTE)).toBe(running);
    expect(resumeTimer(IDLE_TIMER, T0)).toBe(IDLE_TIMER);
  });
});

describe('toLogMinutes', () => {
  it('秒は切り捨てる', () => {
    expect(toLogMinutes(5 * MINUTE + 59 * SECOND)).toEqual({ minutes: 5, capped: false });
  });

  it('1分に満たなければ 0分', () => {
    expect(toLogMinutes(59 * SECOND)).toEqual({ minutes: 0, capped: false });
  });

  it('ちょうど24時間は、そのまま1440分', () => {
    expect(toLogMinutes(24 * HOUR)).toEqual({ minutes: 1440, capped: false });
  });

  it('24時間を超えたら1440分に切り詰め、切り詰めたことを伝える', () => {
    expect(toLogMinutes(24 * HOUR + MINUTE)).toEqual({ minutes: 1440, capped: true });
    expect(toLogMinutes(100 * HOUR)).toEqual({ minutes: 1440, capped: true });
  });

  it('マイナスの値は 0分にする', () => {
    expect(toLogMinutes(-MINUTE)).toEqual({ minutes: 0, capped: false });
  });
});

describe('getTimerLogDate', () => {
  it('開始した日の日付を返す', () => {
    expect(getTimerLogDate(startTimer(null, T0), '2026-11-20')).toBe('2026-11-16');
  });

  it('日付をまたいで計測しても、開始した日の日付のまま', () => {
    // 23:30 に開始して、翌日の 0:30 に一時停止
    const start = new Date(2026, 10, 16, 23, 30).getTime();
    const paused = pauseTimer(startTimer(null, start), start + HOUR);

    expect(getTimerLogDate(paused, '2026-11-17')).toBe('2026-11-16');
  });

  it('計測していなければ、渡した今日の日付を返す', () => {
    expect(getTimerLogDate(IDLE_TIMER, '2026-11-20')).toBe('2026-11-20');
  });
});

describe('formatElapsed', () => {
  it.each([
    [0, '00:00:00'],
    [9 * SECOND, '00:00:09'],
    [5 * MINUTE + 9 * SECOND, '00:05:09'],
    [HOUR + 2 * MINUTE + 3 * SECOND, '01:02:03'],
    [12 * HOUR + 34 * MINUTE + 56 * SECOND, '12:34:56'],
    [100 * HOUR, '100:00:00'],
  ])('%i ミリ秒は %s', (elapsedMs, expected) => {
    expect(formatElapsed(elapsedMs)).toBe(expected);
  });

  it('1秒に満たない分は切り捨てる', () => {
    expect(formatElapsed(1999)).toBe('00:00:01');
  });

  it('マイナスの値は 00:00:00 にする', () => {
    expect(formatElapsed(-5000)).toBe('00:00:00');
  });
});

describe('parseTimerState', () => {
  const running: TimerState = startTimer('week-01', T0);
  const paused: TimerState = pauseTimer(running, T0 + MINUTE);

  it('計測中の状態を読み戻す', () => {
    expect(parseTimerState(JSON.stringify(running))).toEqual(running);
  });

  it('一時停止中の状態を読み戻す', () => {
    expect(parseTimerState(JSON.stringify(paused))).toEqual(paused);
  });

  it('保存されていなければ、止まっている状態にする', () => {
    expect(parseTimerState(null)).toEqual(IDLE_TIMER);
  });

  it.each([
    ['JSONとして読めない文字列', '{壊れたデータ'],
    ['オブジェクトではない値', '"running"'],
    ['知らない状態', JSON.stringify({ ...running, status: 'broken' })],
    ['マイナスの累計', JSON.stringify({ ...paused, accumulatedMs: -1 })],
    ['文字列の時刻', JSON.stringify({ ...running, startedAt: '2026-11-16' })],
    ['開始した時刻がない計測中', JSON.stringify({ ...running, startedAt: null })],
    ['区間の開始時刻がない計測中', JSON.stringify({ ...running, resumedAt: null })],
    ['項目が足りない', JSON.stringify({ status: 'running' })],
  ])('%s は、止まっている状態にする', (_name, raw) => {
    expect(parseTimerState(raw)).toEqual(IDLE_TIMER);
  });
});

describe('pickDefaultWeekId', () => {
  const SETTINGS = { startDate: '2026-11-16', breakPeriods: [] };

  function views(
    today: string,
    prepare?: (roadmap: ReturnType<typeof createInitialRoadmap>) => void,
  ) {
    const roadmap = createInitialRoadmap();
    prepare?.(roadmap);
    return buildWeekViews(roadmap.weeks, roadmap.skills, SETTINGS, today);
  }

  it('現在の週を選ぶ', () => {
    expect(pickDefaultWeekId(views('2026-11-25'))).toBe('week-02');
  });

  it('現在の週が2つあるときは、表示順が先の未完成の週を選ぶ', () => {
    // 11週目の初日。表示順は「11〜12週目」より「11週目（Git）」が先
    const ids = views('2027-01-25')
      .filter(({ isCurrent }) => isCurrent)
      .map(({ week }) => week.id);

    expect(ids).toHaveLength(2);
    expect(pickDefaultWeekId(views('2027-01-25'))).toBe(ids[0]);
  });

  it('現在の週が2つあって先のほうが完成済みなら、もう一方を選ぶ', () => {
    const current = views('2027-01-25').filter(({ isCurrent }) => isCurrent);
    const result = pickDefaultWeekId(
      views('2027-01-25', ({ weeks }) => {
        weeks.find(({ id }) => id === current[0]!.week.id)!.status = 'done';
      }),
    );

    expect(result).toBe(current[1]!.week.id);
  });

  it('現在の週が完成済みなら、次に取り組む未完成の週を選ぶ', () => {
    const result = pickDefaultWeekId(
      views('2026-11-18', ({ weeks }) => {
        weeks[0]!.status = 'done';
      }),
    );

    expect(result).toBe('week-02');
  });

  it('開始前は、最初の未完成の週を選ぶ', () => {
    expect(pickDefaultWeekId(views('2026-11-01'))).toBe('week-01');
  });

  it('すべて完成していれば null（週の指定なし）', () => {
    const result = pickDefaultWeekId(
      views('2026-11-18', ({ weeks }) => {
        for (const week of weeks) week.status = 'done';
      }),
    );

    expect(result).toBeNull();
  });

  it('週がなければ null', () => {
    expect(pickDefaultWeekId([])).toBeNull();
  });
});
