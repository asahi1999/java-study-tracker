import { z } from 'zod';

import { isDateString } from './date';

export const WEEKLY_GOAL_MAX_HOURS = 168;
export const DAILY_GOAL_MAX_MINUTES = 1440;

/** 学習開始日と目標時間の入力チェック。入力欄の文字列のまま受け取り、数値に直す */
export const scheduleSettingsSchema = z.object({
  startDate: z.string().refine(isDateString, { error: '日付を入力してください' }),
  weeklyGoalHours: z
    .string()
    .trim()
    .refine((value) => /^\d+(\.\d)?$/.test(value), {
      error: '週の目標を数字で入力してください（小数は1桁まで）',
    })
    .transform(Number)
    .refine((value) => value > 0 && value <= WEEKLY_GOAL_MAX_HOURS, {
      error: `週の目標は0より大きく、${WEEKLY_GOAL_MAX_HOURS}時間以下で入力してください`,
    }),
  dailyGoalMinutes: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), { error: '1日の目標を分単位の整数で入力してください' })
    .transform(Number)
    .refine((value) => value >= 1 && value <= DAILY_GOAL_MAX_MINUTES, {
      error: `1日の目標は1〜${DAILY_GOAL_MAX_MINUTES}分で入力してください`,
    }),
});

export type ScheduleSettingsInput = z.output<typeof scheduleSettingsSchema>;

export const BREAK_LABEL_MAX = 30;

/** 休止期間の入力チェック */
export const breakPeriodInputSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, { error: '名前を入力してください' })
      .max(BREAK_LABEL_MAX, { error: `名前は${BREAK_LABEL_MAX}文字以内で入力してください` }),
    start: z.string().refine(isDateString, { error: '開始日を入力してください' }),
    end: z.string().refine(isDateString, { error: '終了日を入力してください' }),
  })
  .superRefine(({ start, end }, context) => {
    if (end < start) {
      context.addIssue({
        code: 'custom',
        path: ['end'],
        message: '終了日は開始日と同じか後ろの日付にしてください',
      });
    }
  });

export type BreakPeriodInput = z.output<typeof breakPeriodInputSchema>;
