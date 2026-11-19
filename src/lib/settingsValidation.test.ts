import { describe, expect, it } from 'vitest';

import { breakPeriodInputSchema, scheduleSettingsSchema } from './settingsValidation';
import { getFieldErrors } from './validation';

const validSchedule = { startDate: '2026-11-16', weeklyGoalHours: '9', dailyGoalMinutes: '60' };

function scheduleErrors(overrides: Partial<typeof validSchedule>) {
  const result = scheduleSettingsSchema.safeParse({ ...validSchedule, ...overrides });
  return result.success ? {} : getFieldErrors(result.error);
}

describe('scheduleSettingsSchema', () => {
  it('正しい入力は数値に直す', () => {
    expect(scheduleSettingsSchema.parse({ ...validSchedule, weeklyGoalHours: '7.5' })).toEqual({
      startDate: '2026-11-16',
      weeklyGoalHours: 7.5,
      dailyGoalMinutes: 60,
    });
  });

  it('開始日は実在する日付が必要', () => {
    expect(scheduleErrors({ startDate: '' })).toEqual({ startDate: '日付を入力してください' });
    expect(scheduleErrors({ startDate: '2026-02-30' })).toHaveProperty('startDate');
  });

  it.each(['0', '-1', '7.25', '169', 'x'])('週の目標「%s」は受け付けない', (value) => {
    expect(scheduleErrors({ weeklyGoalHours: value })).toHaveProperty('weeklyGoalHours');
  });

  it.each(['0', '1441', '30.5', ''])('1日の目標「%s」は受け付けない', (value) => {
    expect(scheduleErrors({ dailyGoalMinutes: value })).toHaveProperty('dailyGoalMinutes');
  });

  it('上限ちょうどは受け付ける', () => {
    expect(scheduleErrors({ weeklyGoalHours: '168', dailyGoalMinutes: '1440' })).toEqual({});
  });
});

describe('breakPeriodInputSchema', () => {
  it('正しい入力は名前の前後の空白を取る', () => {
    expect(
      breakPeriodInputSchema.parse({ label: ' 年末年始 ', start: '2026-12-29', end: '2027-01-03' }),
    ).toEqual({ label: '年末年始', start: '2026-12-29', end: '2027-01-03' });
  });

  it('1日だけの休止もよい', () => {
    const result = breakPeriodInputSchema.safeParse({
      label: '帰省',
      start: '2026-12-29',
      end: '2026-12-29',
    });
    expect(result.success).toBe(true);
  });

  it('終了日が開始日より前ならエラー', () => {
    const result = breakPeriodInputSchema.safeParse({
      label: '年末年始',
      start: '2027-01-03',
      end: '2026-12-29',
    });
    expect(result.success ? {} : getFieldErrors(result.error)).toEqual({
      end: '終了日は開始日と同じか後ろの日付にしてください',
    });
  });

  it('名前と日付は必須', () => {
    const result = breakPeriodInputSchema.safeParse({ label: '', start: '', end: '' });
    expect(result.success ? {} : getFieldErrors(result.error)).toEqual({
      label: '名前を入力してください',
      start: '開始日を入力してください',
      end: '終了日を入力してください',
    });
  });
});
