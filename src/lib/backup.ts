import { z } from 'zod';

import type { EarnedBadge, Month, Settings, Skill, Step, StudyLog, Week } from '@/types';

import { isDateString } from './date';
import { repoUrlSchema } from './validation';

/** エクスポートしたファイルに入れる、このアプリのデータであることの印 */
export const BACKUP_APP_ID = 'java-study-tracker';

/** エクスポートするデータ。settings は1件だけなので、配列ではなくそのまま入れる */
export type BackupData = {
  months: Month[];
  steps: Step[];
  weeks: Week[];
  skills: Skill[];
  logs: StudyLog[];
  badges: EarnedBadge[];
  settings: Settings;
};

export type BackupFile = {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  /** エクスポートした日時（ISO形式） */
  exportedAt: string;
  data: BackupData;
};

export function createBackup(
  data: BackupData,
  { schemaVersion, exportedAt }: { schemaVersion: number; exportedAt: string },
): BackupFile {
  return { app: BACKUP_APP_ID, schemaVersion, exportedAt, data };
}

/** 画面に表示し、ファイルにも保存する文字列。人が読めるよう字下げする */
export function stringifyBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function getBackupFileName(today: string): string {
  return `${BACKUP_APP_ID}-${today}.json`;
}

// ---- 読み込むときの検証 ----

const idSchema = z.string().min(1, { error: '空にはできません' });
const dateSchema = z
  .string()
  .refine(isDateString, { error: 'YYYY-MM-DD の形の日付にしてください' });
const dateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { error: '日時の形が正しくありません' });
const orderSchema = z.number().int();

const monthSchema = z.object({
  id: idSchema,
  order: orderSchema,
  title: z.string(),
  milestone: z.string(),
});

const stepSchema = z.object({
  id: idSchema,
  order: orderSchema,
  title: z.string(),
  description: z.string(),
  advice: z.string(),
});

const weekSchema = z
  .object({
    id: idSchema,
    order: orderSchema,
    monthId: idSchema,
    stepId: idSchema,
    weekStart: z.number().int().min(1, { error: '1以上にしてください' }),
    weekEnd: z.number().int().min(1, { error: '1以上にしてください' }),
    title: z.string(),
    plannedHours: z.number().min(0, { error: '0以上にしてください' }),
    status: z.enum(['not_started', 'in_progress', 'done']),
    repoUrl: repoUrlSchema,
    startedAt: dateSchema.nullable(),
    completedAt: dateSchema.nullable(),
    memo: z.string(),
  })
  .refine((week) => week.weekEnd >= week.weekStart, {
    path: ['weekEnd'],
    error: 'weekStart 以上にしてください',
  });

const skillSchema = z.object({
  id: idSchema,
  weekId: idSchema,
  order: orderSchema,
  label: z.string(),
  checked: z.boolean(),
  checkedAt: dateSchema.nullable(),
});

const logSchema = z.object({
  id: idSchema,
  date: dateSchema,
  minutes: z
    .number()
    .int()
    .min(1, { error: '1〜1440にしてください' })
    .max(1440, { error: '1〜1440にしてください' }),
  weekId: idSchema.nullable(),
  content: z.string(),
  source: z.enum(['timer', 'manual']),
  createdAt: dateTimeSchema,
});

const badgeSchema = z.object({ id: idSchema, earnedAt: dateTimeSchema });

const breakPeriodSchema = z
  .object({ id: idSchema, label: z.string(), start: dateSchema, end: dateSchema })
  .refine((period) => period.end >= period.start, {
    path: ['end'],
    error: 'start と同じか後ろの日付にしてください',
  });

const settingsSchema = z.object({
  id: z.literal('app'),
  startDate: dateSchema,
  theme: z.enum(['light', 'dark', 'system']),
  weeklyGoalHours: z.number().gt(0, { error: '0より大きくしてください' }),
  dailyGoalMinutes: z
    .number()
    .int()
    .min(1, { error: '1〜1440にしてください' })
    .max(1440, { error: '1〜1440にしてください' }),
  breakPeriods: z.array(breakPeriodSchema),
  schemaVersion: z.number().int(),
});

const TABLES_WITH_ID = ['months', 'steps', 'weeks', 'skills', 'logs', 'badges'] as const;

const dataSchema = z
  .object({
    months: z.array(monthSchema),
    steps: z.array(stepSchema),
    weeks: z.array(weekSchema),
    skills: z.array(skillSchema),
    logs: z.array(logSchema),
    badges: z.array(badgeSchema),
    settings: settingsSchema,
  })
  // 1件ずつは正しくても、表どうしのつながりが切れていると画面が壊れるので、それも確かめる
  .superRefine((data, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });

    for (const table of TABLES_WITH_ID) {
      const seen = new Set<string>();
      data[table].forEach((row, index) => {
        if (seen.has(row.id)) issue([table, index, 'id'], `ID「${row.id}」が重複しています`);
        seen.add(row.id);
      });
    }

    const monthIds = new Set(data.months.map((month) => month.id));
    const stepIds = new Set(data.steps.map((step) => step.id));
    const weekIds = new Set(data.weeks.map((week) => week.id));

    data.weeks.forEach((week, index) => {
      if (!monthIds.has(week.monthId)) {
        issue(['weeks', index, 'monthId'], `月「${week.monthId}」がありません`);
      }
      if (!stepIds.has(week.stepId)) {
        issue(['weeks', index, 'stepId'], `ステップ「${week.stepId}」がありません`);
      }
    });
    data.skills.forEach((skill, index) => {
      if (!weekIds.has(skill.weekId)) {
        issue(['skills', index, 'weekId'], `週「${skill.weekId}」がありません`);
      }
    });
    data.logs.forEach((log, index) => {
      if (log.weekId !== null && !weekIds.has(log.weekId)) {
        issue(['logs', index, 'weekId'], `週「${log.weekId}」がありません`);
      }
    });
  });

const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.number().int(),
  exportedAt: dateTimeSchema,
  data: dataSchema,
});

const TYPE_LABELS: Record<string, string> = {
  string: '文字列',
  number: '数値',
  int: '整数',
  boolean: 'true か false',
  array: '配列',
  object: 'オブジェクト',
};

/** 型の違いなど、個別にメッセージを書いていない誤りを日本語にする */
const backupErrorMap: z.core.$ZodErrorMap = (issue) => {
  if (issue.code === 'invalid_type') {
    if (issue.input === undefined) return '項目がありません';
    return `${TYPE_LABELS[issue.expected] ?? issue.expected}にしてください`;
  }
  if (issue.code === 'invalid_value') {
    return `${issue.values.map((value) => JSON.stringify(value)).join('・')} のどれかにしてください`;
  }
  return undefined;
};

/** 誤りの場所を「data.weeks[3].title」のような、JSONの中を指す形にする */
function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((text, key) => {
    if (typeof key === 'number') return `${text}[${key}]`;
    return text ? `${text}.${String(key)}` : String(key);
  }, '');
}

export type BackupParseResult = { ok: true; backup: BackupFile } | { ok: false; errors: string[] };

function failure(message: string): BackupParseResult {
  return { ok: false, errors: [message] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * インポートするファイルの中身を検証する。
 * 正しければデータを、誤りがあれば日本語のメッセージの一覧を返す（そのときは何も変更しない）
 */
export function parseBackup(text: string, schemaVersion: number): BackupParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return failure('JSONとして読み込めませんでした。ファイルが壊れていないか確かめてください。');
  }

  // 別のアプリのファイルや版の違うファイルは、細かい誤りを並べずに理由を1つだけ伝える
  if (!isRecord(json) || json.app !== BACKUP_APP_ID) {
    return failure('Java Study Tracker でエクスポートしたファイルではありません。');
  }
  if (json.schemaVersion !== schemaVersion) {
    if (typeof json.schemaVersion === 'number' && json.schemaVersion > schemaVersion) {
      return failure(
        '新しい版のアプリでエクスポートしたファイルです。ページを再読み込みしてから、もう一度読み込んでください。',
      );
    }
    // スキーマの版を上げたときは、ここで古い形のデータを新しい形に変換して読み込めるようにする
    return failure(
      `このアプリでは読み込めない版のファイルです（schemaVersion: ${String(json.schemaVersion)}）。`,
    );
  }

  const result = backupSchema.safeParse(json, { error: backupErrorMap });
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => {
        const path = formatPath(issue.path);
        return path ? `${path}：${issue.message}` : issue.message;
      }),
    };
  }
  return { ok: true, backup: result.data };
}

/** インポートの確認画面に出す、ファイルの中身のまとめ */
export type BackupSummary = {
  exportedAt: string;
  startDate: string;
  months: number;
  steps: number;
  weeks: number;
  skills: number;
  logs: number;
  badges: number;
  totalMinutes: number;
};

export function summarizeBackup({ exportedAt, data }: BackupFile): BackupSummary {
  return {
    exportedAt,
    startDate: data.settings.startDate,
    months: data.months.length,
    steps: data.steps.length,
    weeks: data.weeks.length,
    skills: data.skills.length,
    logs: data.logs.length,
    badges: data.badges.length,
    totalMinutes: data.logs.reduce((sum, log) => sum + log.minutes, 0),
  };
}
