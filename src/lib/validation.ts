import { z } from 'zod';

import { isDateString } from './date';

export const REPO_URL_PREFIX = 'https://github.com/';

/**
 * GitHubリポジトリのURL。前後の空白は取り除く。
 * 未入力（空文字）は「まだ登録していない」として認める
 */
export const repoUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === '' ||
      (value.startsWith(REPO_URL_PREFIX) &&
        value.length > REPO_URL_PREFIX.length &&
        !/\s/.test(value)),
    { error: `${REPO_URL_PREFIX} で始まるURLを入力してください` },
  );

export type WeekDatesInput = {
  /** 実際の開始日。空文字は未入力 */
  startedAt: string;
  /** 実際の完了日。空文字は未入力 */
  completedAt: string;
};

/**
 * 週の「実際の開始日・完了日」の入力チェック。
 * 「今日」と「完成しているか」で結果が変わるので、その都度スキーマを作る
 */
export function createWeekDatesSchema({ today, isDone }: { today: string; isDone: boolean }) {
  const dateField = z
    .string()
    .refine((value) => value === '' || isDateString(value), {
      error: '日付を正しく入力してください',
    })
    .refine((value) => value === '' || !isDateString(value) || value <= today, {
      error: '今日より先の日付は入力できません',
    });

  return z
    .object({ startedAt: dateField, completedAt: dateField })
    .superRefine(({ startedAt, completedAt }, context) => {
      if (isDone && completedAt === '') {
        context.addIssue({
          code: 'custom',
          path: ['completedAt'],
          message: '完成した週の完了日は空にできません',
        });
      }
      if (isDateString(startedAt) && isDateString(completedAt) && startedAt > completedAt) {
        context.addIssue({
          code: 'custom',
          path: ['completedAt'],
          message: '完了日は開始日以降の日付にしてください',
        });
      }
    });
}

/** 入力チェックの結果から、項目ごとの最初のエラーメッセージを取り出す */
export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (!(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
