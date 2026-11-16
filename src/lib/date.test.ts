import { describe, expect, it } from 'vitest';

import {
  addDaysToDate,
  diffInDays,
  isDateString,
  parseDateString,
  startOfWeekMonday,
  toDateString,
  todayString,
} from './date';

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

describe('parseDateString', () => {
  it('ローカル時刻でその日の0時を指す Date にする', () => {
    const date = parseDateString('2026-11-16');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 16]);
    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('toDateString で元の文字列に戻る', () => {
    expect(toDateString(parseDateString('2027-02-07'))).toBe('2027-02-07');
  });
});

describe('isDateString', () => {
  it.each(['2026-11-16', '2027-01-01', '2028-02-29'])('%s は正しい日付', (value) => {
    expect(isDateString(value)).toBe(true);
  });

  it.each([
    ['存在しない日', '2026-02-30'],
    ['うるう年でない2月29日', '2027-02-29'],
    ['13月', '2026-13-01'],
    ['0埋めなし', '2026-2-3'],
    ['区切りがスラッシュ', '2026/11/16'],
    ['時刻つき', '2026-11-16T00:00:00'],
    ['空文字', ''],
    ['日付でない文字列', 'today'],
  ])('%s（%s）は正しくない', (_label, value) => {
    expect(isDateString(value)).toBe(false);
  });
});

describe('addDaysToDate', () => {
  it('日数を足す', () => {
    expect(addDaysToDate('2026-11-16', 6)).toBe('2026-11-22');
  });

  it('0日なら同じ日を返す', () => {
    expect(addDaysToDate('2026-11-16', 0)).toBe('2026-11-16');
  });

  it('マイナスなら前の日を返す', () => {
    expect(addDaysToDate('2026-11-16', -1)).toBe('2026-11-15');
  });

  it('月をまたぐ', () => {
    expect(addDaysToDate('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('年をまたぐ', () => {
    expect(addDaysToDate('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('うるう年の2月29日を通る', () => {
    expect(addDaysToDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToDate('2028-02-28', 2)).toBe('2028-03-01');
  });
});

describe('diffInDays', () => {
  it('何日後かを返す', () => {
    expect(diffInDays('2026-11-22', '2026-11-16')).toBe(6);
  });

  it('同じ日なら 0 を返す', () => {
    expect(diffInDays('2026-11-16', '2026-11-16')).toBe(0);
  });

  it('前の日ならマイナスを返す', () => {
    expect(diffInDays('2026-11-15', '2026-11-16')).toBe(-1);
  });

  it('年をまたいで数える', () => {
    expect(diffInDays('2027-01-04', '2026-12-28')).toBe(7);
  });

  it('addDaysToDate と逆の関係になる', () => {
    expect(diffInDays(addDaysToDate('2026-11-16', 83), '2026-11-16')).toBe(83);
  });
});

describe('startOfWeekMonday', () => {
  it('月曜日はその日を返す', () => {
    expect(startOfWeekMonday('2026-11-16')).toBe('2026-11-16');
  });

  it('週の途中の日は、その週の月曜日を返す', () => {
    expect(startOfWeekMonday('2026-11-19')).toBe('2026-11-16');
  });

  it('日曜日は、6日前の月曜日を返す（日曜始まりにしない）', () => {
    expect(startOfWeekMonday('2026-11-22')).toBe('2026-11-16');
  });

  it('年をまたぐ週でも月曜日を返す', () => {
    expect(startOfWeekMonday('2027-01-01')).toBe('2026-12-28');
  });
});
