import { describe, expect, it } from 'vitest';

import {
  monthInputSchema,
  skillLabelSchema,
  stepInputSchema,
  WEEK_NUMBER_MAX,
  weekInputSchema,
} from './editorValidation';
import { getFieldErrors } from './validation';

const validWeek = {
  title: ' 電卓アプリ ',
  monthId: 'month-1',
  stepId: 'step-1',
  weekStart: '13',
  weekEnd: '14',
  plannedHours: '4.5',
};

function weekErrors(overrides: Partial<typeof validWeek>) {
  const result = weekInputSchema.safeParse({ ...validWeek, ...overrides });
  return result.success ? {} : getFieldErrors(result.error);
}

describe('weekInputSchema', () => {
  it('正しい入力は、前後の空白を取り、数値に直す', () => {
    expect(weekInputSchema.parse(validWeek)).toEqual({
      title: '電卓アプリ',
      monthId: 'month-1',
      stepId: 'step-1',
      weekStart: 13,
      weekEnd: 14,
      plannedHours: 4.5,
    });
  });

  it('作るものは必須', () => {
    expect(weekErrors({ title: '   ' })).toEqual({ title: '作るものを入力してください' });
  });

  it('月とステップは選ぶ必要がある', () => {
    expect(weekErrors({ monthId: '', stepId: '' })).toEqual({
      monthId: '月を選んでください',
      stepId: 'ステップを選んでください',
    });
  });

  it.each(['0', '-1', '1.5', 'a', ''])('週番号「%s」は受け付けない', (value) => {
    expect(weekErrors({ weekStart: value, weekEnd: '1' })).toHaveProperty('weekStart');
  });

  it(`週番号は${WEEK_NUMBER_MAX}まで`, () => {
    expect(weekErrors({ weekStart: '52', weekEnd: '52' })).toEqual({});
    expect(weekErrors({ weekStart: '52', weekEnd: '53' })).toEqual({
      weekEnd: `終了の週は1〜${WEEK_NUMBER_MAX}で入力してください`,
    });
  });

  it('終了の週が開始の週より前ならエラー。同じ週はよい', () => {
    expect(weekErrors({ weekStart: '5', weekEnd: '4' })).toEqual({
      weekEnd: '終了の週は、開始の週と同じか後ろの週にしてください',
    });
    expect(weekErrors({ weekStart: '5', weekEnd: '5' })).toEqual({});
  });

  it.each(['0', '1.25', 'abc', '1000'])('予定時間「%s」は受け付けない', (value) => {
    expect(weekErrors({ plannedHours: value })).toHaveProperty('plannedHours');
  });

  it.each(['9', '13.5', '999'])('予定時間「%s」は受け付ける', (value) => {
    expect(weekErrors({ plannedHours: value })).toEqual({});
  });
});

describe('monthInputSchema', () => {
  it('名前は必須で、マイルストーンは空でもよい', () => {
    expect(monthInputSchema.parse({ title: ' 4ヶ月目 ', milestone: '' })).toEqual({
      title: '4ヶ月目',
      milestone: '',
    });
    expect(monthInputSchema.safeParse({ title: '', milestone: '' }).success).toBe(false);
  });

  it('文字数の上限を超えるとエラー', () => {
    const result = monthInputSchema.safeParse({ title: 'あ'.repeat(31), milestone: '' });
    expect(result.success).toBe(false);
  });
});

describe('stepInputSchema', () => {
  it('名前は必須で、学ぶ内容とアドバイスは空でもよい', () => {
    expect(stepInputSchema.parse({ title: 'Docker', description: '', advice: '' })).toEqual({
      title: 'Docker',
      description: '',
      advice: '',
    });
    expect(stepInputSchema.safeParse({ title: ' ', description: '', advice: '' }).success).toBe(
      false,
    );
  });
});

describe('skillLabelSchema', () => {
  it('前後の空白を取り、空ならエラー', () => {
    expect(skillLabelSchema.parse(' 変数 ')).toBe('変数');
    expect(skillLabelSchema.safeParse('  ').success).toBe(false);
    expect(skillLabelSchema.safeParse('あ'.repeat(101)).success).toBe(false);
  });
});
