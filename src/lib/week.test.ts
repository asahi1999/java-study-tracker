import { describe, expect, it } from 'vitest';

import {
  formatWeekLabel,
  formatWeekRange,
  formatWeekRangeShort,
  normalizeWeekSpan,
  WEEK_STATUS_LABELS,
} from './week';

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

describe('normalizeWeekSpan', () => {
  it('正しい範囲はそのまま返す', () => {
    expect(normalizeWeekSpan({ weekStart: 5, weekEnd: 6 })).toEqual({ start: 5, end: 6 });
  });

  it('1より小さい開始は1週目にする', () => {
    expect(normalizeWeekSpan({ weekStart: 0, weekEnd: 2 })).toEqual({ start: 1, end: 2 });
    expect(normalizeWeekSpan({ weekStart: -3, weekEnd: -1 })).toEqual({ start: 1, end: 1 });
  });

  it('開始より前の終了は、開始と同じ週にする', () => {
    expect(normalizeWeekSpan({ weekStart: 4, weekEnd: 2 })).toEqual({ start: 4, end: 4 });
  });

  it('小数は切り捨てる', () => {
    expect(normalizeWeekSpan({ weekStart: 2.9, weekEnd: 3.5 })).toEqual({ start: 2, end: 3 });
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

describe('formatWeekLabel', () => {
  it('週番号と作るものを並べる', () => {
    expect(formatWeekLabel({ weekStart: 1, weekEnd: 1, title: '数当てゲーム' })).toBe(
      '1週目 数当てゲーム',
    );
  });

  it('複数週にまたがる週は、範囲で表示する', () => {
    expect(formatWeekLabel({ weekStart: 5, weekEnd: 6, title: '単語帳アプリ' })).toBe(
      '5〜6週目 単語帳アプリ',
    );
  });
});
