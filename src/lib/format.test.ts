import { describe, expect, it } from 'vitest';

import {
  formatDateRange,
  formatDateTime,
  formatDateWithWeekday,
  formatFullDate,
  formatHours,
  formatMinutes,
  formatShortDate,
  formatStepNumber,
} from './format';

describe('formatShortDate', () => {
  it('月/日 の形にする', () => {
    expect(formatShortDate('2026-11-16')).toBe('11/16');
  });

  it('0埋めはしない', () => {
    expect(formatShortDate('2027-01-03')).toBe('1/3');
  });
});

describe('formatDateRange', () => {
  it('開始日と終了日を「〜」でつなぐ', () => {
    expect(formatDateRange({ start: '2026-11-16', end: '2026-11-22' })).toBe('11/16〜11/22');
  });

  it('年をまたぐ期間もそのまま並べる', () => {
    expect(formatDateRange({ start: '2026-12-28', end: '2027-01-09' })).toBe('12/28〜1/9');
  });
});

describe('formatDateWithWeekday', () => {
  it('日本語の曜日を付ける', () => {
    expect(formatDateWithWeekday('2026-11-16')).toBe('11月16日（月）');
    expect(formatDateWithWeekday('2026-11-22')).toBe('11月22日（日）');
  });
});

describe('formatMinutes', () => {
  it('60分未満は分だけで表示する', () => {
    expect(formatMinutes(45)).toBe('45分');
    expect(formatMinutes(0)).toBe('0分');
  });

  it('ちょうどの時間は時間だけで表示する', () => {
    expect(formatMinutes(60)).toBe('1時間');
    expect(formatMinutes(120)).toBe('2時間');
  });

  it('端数があれば「時間」と「分」の両方を表示する', () => {
    expect(formatMinutes(200)).toBe('3時間20分');
    expect(formatMinutes(61)).toBe('1時間1分');
  });

  it('1日の上限（1440分）は24時間と表示する', () => {
    expect(formatMinutes(1440)).toBe('24時間');
  });

  it('マイナスは0分として扱う', () => {
    expect(formatMinutes(-10)).toBe('0分');
  });
});

describe('formatHours', () => {
  it('整数も小数もそのまま表示する', () => {
    expect(formatHours(9)).toBe('9時間');
    expect(formatHours(4.5)).toBe('4.5時間');
  });
});

describe('formatStepNumber', () => {
  it('1〜20は丸数字にする', () => {
    expect(formatStepNumber(1)).toBe('①');
    expect(formatStepNumber(8)).toBe('⑧');
    expect(formatStepNumber(20)).toBe('⑳');
  });

  it('丸数字がない番号は数字のまま返す', () => {
    expect(formatStepNumber(21)).toBe('21');
    expect(formatStepNumber(0)).toBe('0');
  });
});

describe('formatFullDate', () => {
  it('年と曜日つきの日付にする', () => {
    expect(formatFullDate('2026-12-29')).toBe('2026年12月29日（火）');
    expect(formatFullDate('2027-01-03')).toBe('2027年1月3日（日）');
  });
});

describe('formatDateTime', () => {
  it('ISO形式の日時を、ローカル時刻の年月日と時刻にする', () => {
    // 時差のある環境でも同じ結果になるよう、ローカル時刻で作った日時を渡す
    expect(formatDateTime(new Date(2026, 10, 19, 9, 5).toISOString())).toBe('2026年11月19日 9:05');
  });
});
