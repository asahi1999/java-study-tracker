import { describe, expect, it } from 'vitest';

import { toDateString, todayString } from './date';

describe('toDateString', () => {
  it('ローカル時刻の YYYY-MM-DD に変換する', () => {
    expect(toDateString(new Date(2026, 10, 16, 12, 0))).toBe('2026-11-16');
  });

  it('月と日を2桁にそろえる', () => {
    expect(toDateString(new Date(2027, 0, 3, 12, 0))).toBe('2027-01-03');
  });

  it('深夜0時台でも前日にならない', () => {
    expect(toDateString(new Date(2027, 0, 1, 0, 30))).toBe('2027-01-01');
  });

  it('23時台でも翌日にならない', () => {
    expect(toDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('todayString', () => {
  it('渡した日時の日付を返す', () => {
    expect(todayString(new Date(2026, 10, 16, 8, 0))).toBe('2026-11-16');
  });

  it('引数を省略すると現在の日付を返す', () => {
    expect(todayString()).toBe(toDateString(new Date()));
  });
});
