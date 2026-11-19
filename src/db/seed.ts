import { createInitialRoadmap } from '@/data/initialRoadmap';
import { db, SCHEMA_VERSION } from '@/db/database';
import { todayString } from '@/lib/date';
import type { Settings } from '@/types';

export function createInitialSettings(startDate: string): Settings {
  return {
    id: 'app',
    startDate,
    theme: 'system',
    weeklyGoalHours: 9,
    dailyGoalMinutes: 60,
    breakPeriods: [],
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * 初回起動時だけ、初期ロードマップと初期設定を投入する。
 * @returns 投入したら true、すでにデータがあれば false
 */
export async function seedIfEmpty(today: string = todayString()): Promise<boolean> {
  // 確認と投入を1つのトランザクションにまとめる。
  // 開発時の StrictMode やタブの同時起動で2回呼ばれても、二重に投入されないようにするため
  return db.transaction('rw', [db.months, db.steps, db.weeks, db.skills, db.settings], async () => {
    const settings = await db.settings.get('app');
    if (settings) return false;

    await writeInitialData(today);
    return true;
  });
}

/**
 * 初期ロードマップと初期設定を書き込む。初回起動時と、全データのリセットで使う。
 * 書き込む先のテーブルは空になっていること。months・steps・weeks・skills・settings を含む
 * トランザクションの中で呼ぶ
 */
export async function writeInitialData(today: string): Promise<void> {
  const roadmap = createInitialRoadmap();
  await db.months.bulkAdd(roadmap.months);
  await db.steps.bulkAdd(roadmap.steps);
  await db.weeks.bulkAdd(roadmap.weeks);
  await db.skills.bulkAdd(roadmap.skills);
  await db.settings.add(createInitialSettings(today));
}
