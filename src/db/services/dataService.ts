import { db, SCHEMA_VERSION } from '@/db/database';
import {
  badgeRepository,
  logRepository,
  monthRepository,
  settingsRepository,
  skillRepository,
  stepRepository,
  weekRepository,
} from '@/db/repositories';
import { writeInitialData } from '@/db/seed';
import {
  type BackupData,
  type BackupFile,
  type BackupParseResult,
  createBackup,
  parseBackup,
} from '@/lib/backup';
import { todayString } from '@/lib/date';

// 全データをまとめて扱う手順（エクスポート・インポート・リセット）。
// どれも全テーブルを1つのトランザクションで読み書きし、途中で失敗したら何も変わらないようにする

export const dataService = {
  /** 全テーブルを読み、エクスポートする形にまとめる */
  async exportAll(now: Date = new Date()): Promise<BackupFile> {
    return db.transaction('r', db.tables, async () => {
      const [months, steps, weeks, skills, logs, badges, settings] = await Promise.all([
        monthRepository.getAll(),
        stepRepository.getAll(),
        weekRepository.getAll(),
        skillRepository.getAll(),
        logRepository.getAll(),
        badgeRepository.getAll(),
        settingsRepository.get(),
      ]);
      if (!settings) throw new Error('設定が見つからないため、エクスポートできません。');

      return createBackup(
        { months, steps, weeks, skills, logs, badges, settings },
        { schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString() },
      );
    });
  },

  /** インポートするファイルの中身を、今のアプリのスキーマの版で検証する。DBはまだ変えない */
  validateImport(text: string): BackupParseResult {
    return parseBackup(text, SCHEMA_VERSION);
  },

  /** 今のデータをすべて消し、検証済みのデータに置き換える */
  async importAll(data: BackupData): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
      await db.months.bulkAdd(data.months);
      await db.steps.bulkAdd(data.steps);
      await db.weeks.bulkAdd(data.weeks);
      await db.skills.bulkAdd(data.skills);
      await db.logs.bulkAdd(data.logs);
      await db.badges.bulkAdd(data.badges);
      // 保存したデータの形は、今のアプリのスキーマの版になる
      await db.settings.add({ ...data.settings, schemaVersion: SCHEMA_VERSION });
    });
  },

  /** すべてのデータを消し、初めて開いたときと同じ状態（初期ロードマップ・初期設定）に戻す */
  async resetAll(today: string = todayString()): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
      await writeInitialData(today);
    });
  },
};
