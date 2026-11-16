import Dexie, { type Table } from 'dexie';

import type { EarnedBadge, Month, Settings, Skill, Step, StudyLog, Week } from '@/types';

export const DB_NAME = 'java-study-tracker';

/** エクスポートJSONと設定に記録するスキーマのバージョン。stores() を変えたら上げる */
export const SCHEMA_VERSION = 1;

export class AppDatabase extends Dexie {
  months!: Table<Month, string>;
  steps!: Table<Step, string>;
  weeks!: Table<Week, string>;
  skills!: Table<Skill, string>;
  logs!: Table<StudyLog, string>;
  badges!: Table<EarnedBadge, string>;
  settings!: Table<Settings, string>;

  constructor(name: string = DB_NAME) {
    super(name);

    // 先頭が主キー、残りは検索・並び替えに使うインデックス
    this.version(1).stores({
      months: 'id, order',
      steps: 'id, order',
      weeks: 'id, order, monthId, stepId, status',
      skills: 'id, weekId, order',
      logs: 'id, date, weekId',
      badges: 'id',
      settings: 'id',
    });

    // スキーマを変えるときは version(1) を書き換えず、下に追記する。
    // 既存ユーザーのデータは upgrade() の中で新しい形に変換する。
    //
    // this.version(2)
    //   .stores({ logs: 'id, date, weekId, source' })
    //   .upgrade((tx) => tx.table('logs').toCollection().modify((log) => { ... }));
  }
}

export const db = new AppDatabase();
