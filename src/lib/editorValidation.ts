import { z } from 'zod';

// ロードマップ編集の入力チェック。数値の欄も入力欄の文字列のまま受け取り、ここで数値に直す

/** 必須の文字列。前後の空白は取り除いてから数える */
function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: `${label}を入力してください` })
    .max(max, { error: `${label}は${max}文字以内で入力してください` });
}

/** 空でもよい文字列 */
function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: `${label}は${max}文字以内で入力してください` });
}

export const MONTH_TITLE_MAX = 30;
export const MILESTONE_MAX = 200;

export const monthInputSchema = z.object({
  title: requiredText('名前', MONTH_TITLE_MAX),
  milestone: optionalText('マイルストーン', MILESTONE_MAX),
});

export type MonthInput = z.output<typeof monthInputSchema>;

export const STEP_TITLE_MAX = 50;
export const STEP_TEXT_MAX = 300;

export const stepInputSchema = z.object({
  title: requiredText('名前', STEP_TITLE_MAX),
  description: optionalText('学ぶ内容', STEP_TEXT_MAX),
  advice: optionalText('アドバイス', STEP_TEXT_MAX),
});

export type StepInput = z.output<typeof stepInputSchema>;

export const WEEK_TITLE_MAX = 100;
/** 週番号の上限。1年分（52週）まで */
export const WEEK_NUMBER_MAX = 52;
export const PLANNED_HOURS_MAX = 999;

function weekNumber(label: string) {
  return z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), { error: `${label}を整数で入力してください` })
    .transform(Number)
    .refine((value) => value >= 1 && value <= WEEK_NUMBER_MAX, {
      error: `${label}は1〜${WEEK_NUMBER_MAX}で入力してください`,
    });
}

export const weekInputSchema = z
  .object({
    title: requiredText('作るもの', WEEK_TITLE_MAX),
    monthId: z.string().min(1, { error: '月を選んでください' }),
    stepId: z.string().min(1, { error: 'ステップを選んでください' }),
    weekStart: weekNumber('開始の週'),
    weekEnd: weekNumber('終了の週'),
    // 初期データに 4.5時間・13.5時間 があるので、小数第1位まで認める
    plannedHours: z
      .string()
      .trim()
      .refine((value) => /^\d+(\.\d)?$/.test(value), {
        error: '予定時間を数字で入力してください（小数は1桁まで）',
      })
      .transform(Number)
      .refine((value) => value > 0 && value <= PLANNED_HOURS_MAX, {
        error: `予定時間は0より大きく、${PLANNED_HOURS_MAX}以下で入力してください`,
      }),
  })
  .superRefine(({ weekStart, weekEnd }, context) => {
    if (weekEnd < weekStart) {
      context.addIssue({
        code: 'custom',
        path: ['weekEnd'],
        message: '終了の週は、開始の週と同じか後ろの週にしてください',
      });
    }
  });

export type WeekInput = z.output<typeof weekInputSchema>;

export const SKILL_LABEL_MAX = 100;

export const skillLabelSchema = requiredText('項目', SKILL_LABEL_MAX);
