import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';
import type { Settings } from '@/types';

import { buildLog } from '../../tests/factories';
import {
  type BackupData,
  type BackupFile,
  createBackup,
  getBackupFileName,
  parseBackup,
  stringifyBackup,
  summarizeBackup,
} from './backup';

const SCHEMA_VERSION = 1;
const EXPORTED_AT = '2026-11-19T01:30:00.000Z';

const settings: Settings = {
  id: 'app',
  startDate: '2026-11-16',
  theme: 'dark',
  weeklyGoalHours: 9,
  dailyGoalMinutes: 60,
  breakPeriods: [{ id: 'break-1', label: '年末年始', start: '2026-12-29', end: '2027-01-03' }],
  schemaVersion: SCHEMA_VERSION,
};

function buildData(): BackupData {
  return {
    ...createInitialRoadmap(),
    logs: [
      buildLog({ id: 'log-1', weekId: 'week-01', minutes: 90 }),
      buildLog({ id: 'log-2', weekId: null, minutes: 30 }),
    ],
    badges: [{ id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' }],
    settings,
  };
}

function buildFile(): BackupFile {
  return createBackup(buildData(), { schemaVersion: SCHEMA_VERSION, exportedAt: EXPORTED_AT });
}

type JsonPath = readonly (string | number)[];

/** 消す印。parseEdited に渡すと、その項目を JSON から取り除く */
const REMOVE = Symbol('remove');

/** JSONの指定した場所の値を書き換えてから読み込む */
function parseEdited(edits: readonly (readonly [JsonPath, unknown])[]) {
  const json: unknown = JSON.parse(stringifyBackup(buildFile()));
  for (const [path, value] of edits) {
    const parent = path
      .slice(0, -1)
      .reduce<unknown>(
        (node, key) => (node as Record<string | number, unknown>)[key],
        json,
      ) as Record<string | number, unknown>;
    const key = path.at(-1)!;
    if (value === REMOVE) delete parent[key];
    else parent[key] = value;
  }
  return parseBackup(JSON.stringify(json), SCHEMA_VERSION);
}

function errorsOf(result: ReturnType<typeof parseBackup>): string[] {
  return result.ok ? [] : result.errors;
}

describe('createBackup / stringifyBackup', () => {
  it('アプリの印・スキーマの版・日時・データをまとめる', () => {
    const file = buildFile();
    expect(file).toMatchObject({
      app: 'java-study-tracker',
      schemaVersion: 1,
      exportedAt: EXPORTED_AT,
    });
    expect(Object.keys(file.data)).toEqual([
      'months',
      'steps',
      'weeks',
      'skills',
      'logs',
      'badges',
      'settings',
    ]);
  });

  it('字下げしたJSONにする', () => {
    expect(stringifyBackup(buildFile())).toMatch(/^\{\n {2}"app": "java-study-tracker",/);
  });
});

describe('getBackupFileName', () => {
  it('日付の入ったファイル名にする', () => {
    expect(getBackupFileName('2026-11-19')).toBe('java-study-tracker-2026-11-19.json');
  });
});

describe('parseBackup', () => {
  it('エクスポートしたものは、そのまま読み込める', () => {
    const file = buildFile();
    expect(parseBackup(stringifyBackup(file), SCHEMA_VERSION)).toEqual({ ok: true, backup: file });
  });

  it('JSONでなければ、その理由だけを返す', () => {
    expect(errorsOf(parseBackup('{ "app": ', SCHEMA_VERSION))).toEqual([
      'JSONとして読み込めませんでした。ファイルが壊れていないか確かめてください。',
    ]);
  });

  it.each([
    ['ほかのアプリのデータ', '{"app":"other-app","schemaVersion":1}'],
    ['オブジェクトでない', '[1, 2, 3]'],
    ['null', 'null'],
  ])('%sは、このアプリのファイルではないと伝える', (_, text) => {
    expect(errorsOf(parseBackup(text, SCHEMA_VERSION))).toEqual([
      'Java Study Tracker でエクスポートしたファイルではありません。',
    ]);
  });

  it('新しい版のファイルは、再読み込みを案内する', () => {
    const result = parseEdited([[['schemaVersion'], 2]]);
    expect(errorsOf(result)[0]).toMatch(/^新しい版のアプリでエクスポートしたファイルです/);
  });

  it('読み込めない版のファイルは、その版を伝える', () => {
    const result = parseEdited([[['schemaVersion'], '1']]);
    expect(errorsOf(result)).toEqual([
      'このアプリでは読み込めない版のファイルです（schemaVersion: 1）。',
    ]);
  });

  it('誤りは、JSONの中の場所と日本語の理由で返す', () => {
    const result = parseEdited([
      [['data', 'weeks', 2, 'title'], 3],
      [['data', 'weeks', 3, 'status'], 'finished'],
      [['data', 'logs', 0, 'minutes'], REMOVE],
      [['data', 'skills', 0, 'checked'], 'yes'],
      [['data', 'months', 0, 'order'], 1.5],
    ]);
    expect(errorsOf(result)).toEqual([
      'data.months[0].order：整数にしてください',
      'data.weeks[2].title：文字列にしてください',
      'data.weeks[3].status："not_started"・"in_progress"・"done" のどれかにしてください',
      'data.skills[0].checked：true か falseにしてください',
      'data.logs[0].minutes：項目がありません',
    ]);
  });

  it('週番号の前後を確かめる', () => {
    const result = parseEdited([
      [['data', 'weeks', 0, 'weekStart'], 3],
      [['data', 'weeks', 0, 'weekEnd'], 2],
    ]);
    expect(errorsOf(result)).toEqual(['data.weeks[0].weekEnd：weekStart 以上にしてください']);
  });

  it('値の範囲や日付の形も確かめる', () => {
    const result = parseEdited([
      [['data', 'weeks', 0, 'weekStart'], 0],
      [['data', 'weeks', 1, 'startedAt'], '2026/11/16'],
      [['data', 'logs', 0, 'minutes'], 1441],
      [['data', 'settings', 'breakPeriods', 0, 'end'], '2026-12-01'],
      [['data', 'settings', 'theme'], 'blue'],
    ]);
    expect(errorsOf(result)).toEqual([
      'data.weeks[0].weekStart：1以上にしてください',
      'data.weeks[1].startedAt：YYYY-MM-DD の形の日付にしてください',
      'data.logs[0].minutes：1〜1440にしてください',
      'data.settings.theme："light"・"dark"・"system" のどれかにしてください',
      'data.settings.breakPeriods[0].end：start と同じか後ろの日付にしてください',
    ]);
  });

  it('GitHub の URL でないものは受け付けない', () => {
    const result = parseEdited([[['data', 'weeks', 0, 'repoUrl'], 'https://example.com/repo']]);
    expect(errorsOf(result)).toEqual([
      'data.weeks[0].repoUrl：https://github.com/ で始まるURLを入力してください',
    ]);
  });

  it('IDの重複と、ない月・ステップ・週を指すデータを見つける', () => {
    const result = parseEdited([
      [['data', 'logs', 1, 'id'], 'log-1'],
      [['data', 'weeks', 2, 'monthId'], 'month-9'],
      [['data', 'weeks', 2, 'stepId'], 'step-9'],
      [['data', 'skills', 0, 'weekId'], 'week-99'],
      [['data', 'logs', 0, 'weekId'], 'week-99'],
    ]);
    expect(errorsOf(result)).toEqual([
      'data.logs[1].id：ID「log-1」が重複しています',
      'data.weeks[2].monthId：月「month-9」がありません',
      'data.weeks[2].stepId：ステップ「step-9」がありません',
      'data.skills[0].weekId：週「week-99」がありません',
      'data.logs[0].weekId：週「week-99」がありません',
    ]);
  });

  it('週を指定していない学習ログは受け付ける', () => {
    const result = parseEdited([[['data', 'logs', 0, 'weekId'], null]]);
    expect(result.ok).toBe(true);
  });

  it('表が丸ごとないときも伝える', () => {
    const result = parseEdited([[['data', 'badges'], REMOVE]]);
    expect(errorsOf(result)).toEqual(['data.badges：項目がありません']);
  });

  it('知らない項目は取り除いて読み込む', () => {
    const result = parseEdited([[['data', 'weeks', 0, 'extra'], 'x']]);
    expect(result.ok && result.backup.data.weeks[0]).not.toHaveProperty('extra');
  });
});

describe('summarizeBackup', () => {
  it('件数・開始日・学習時間の合計をまとめる', () => {
    expect(summarizeBackup(buildFile())).toEqual({
      exportedAt: EXPORTED_AT,
      startDate: '2026-11-16',
      months: 3,
      steps: 8,
      weeks: 10,
      skills: 40,
      logs: 2,
      badges: 1,
      totalMinutes: 120,
    });
  });
});
