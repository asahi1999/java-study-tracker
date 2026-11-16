import { describe, expect, it } from 'vitest';

import { formatWeekRange, formatWeekRangeShort, WEEK_STATUS_LABELS } from './week';

describe('formatWeekRange', () => {
  it('1週だけなら「N週目」にする', () => {
    expect(formatWeekRange({ weekStart: 1, weekEnd: 1 })).toBe('1週目');
  });

  it('複数週にまたがるなら「N〜M週目」にする', () => {
    expect(formatWeekRange({ weekStart: 5, weekEnd: 6 })).toBe('5〜6週目');
  });
});

describe('formatWeekRangeShort', () => {
  it('1週だけなら数字だけにする', () => {
    expect(formatWeekRangeShort({ weekStart: 11, weekEnd: 11 })).toBe('11');
  });

  it('複数週にまたがるなら「N–M」にする', () => {
    expect(formatWeekRangeShort({ weekStart: 11, weekEnd: 12 })).toBe('11–12');
  });
});

describe('WEEK_STATUS_LABELS', () => {
  it('すべての状態に日本語の名前がある', () => {
    expect(WEEK_STATUS_LABELS).toEqual({
      not_started: '未着手',
      in_progress: '進行中',
      done: '完成',
    });
  });
});
