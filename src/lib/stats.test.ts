import { describe, expect, it } from 'vitest';

import { getMinutesInCalendarWeek, getMinutesOnDate, sumMinutes } from './stats';

const log = (date: string, minutes: number) => ({ date, minutes });

describe('sumMinutes', () => {
  it('学習時間を合計する', () => {
    expect(sumMinutes([{ minutes: 30 }, { minutes: 45 }])).toBe(75);
  });

  it('ログがなければ 0', () => {
    expect(sumMinutes([])).toBe(0);
  });
});

describe('getMinutesOnDate', () => {
  it('指定した日のログだけを合計する', () => {
    const logs = [log('2026-11-15', 20), log('2026-11-16', 30), log('2026-11-16', 45)];

    expect(getMinutesOnDate(logs, '2026-11-16')).toBe(75);
  });

  it('その日のログがなければ 0', () => {
    expect(getMinutesOnDate([log('2026-11-15', 20)], '2026-11-16')).toBe(0);
  });
});

describe('getMinutesInCalendarWeek', () => {
  // 2026-11-16 は月曜日、2026-11-22 は日曜日
  const logs = [
    log('2026-11-15', 100), // 前の週の日曜日
    log('2026-11-16', 30), // 月曜日
    log('2026-11-19', 40),
    log('2026-11-22', 50), // 日曜日
    log('2026-11-23', 200), // 次の週の月曜日
  ];

  it('月曜日から日曜日までを合計する', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-11-18')).toBe(120);
  });

  it('月曜日に見ても、同じ週を合計する', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-11-16')).toBe(120);
  });

  it('日曜日に見ても、同じ週を合計する（日曜始まりにしない）', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-11-22')).toBe(120);
  });

  it('その週のログがなければ 0', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-12-01')).toBe(0);
  });
});
