// v2 の DB（設計書 3-1）。v1 の DB（java-study-tracker）とは別の名前で作り、v1 には書き込まない。
// v1 の画面とファイルはフェーズ3で消すまで src/db/database.ts（v1）に残るので、v2 はこのフォルダに置く
import Dexie, { type EntityTable } from 'dexie';

import type {
  Attempt,
  Chest,
  DexEntry,
  Draft,
  Legacy,
  Meta,
  Note,
  Progress,
  RestWeek,
  Review,
  Session,
  TechCard,
} from './types';

export const DB_NAME = 'java-study-tracker-v2';
export const V1_DB_NAME = 'java-study-tracker';
export const EXPORT_SCHEMA_VERSION = 2;

export class V2Database extends Dexie {
  meta!: EntityTable<Meta, 'key'>;
  progress!: EntityTable<Progress, 'stepId'>;
  attempts!: EntityTable<Attempt, 'id'>;
  drafts!: EntityTable<Draft, 'stepId'>;
  sessions!: EntityTable<Session, 'id'>;
  dex!: EntityTable<DexEntry, 'errorId'>;
  cards!: EntityTable<TechCard, 'conceptId'>;
  reviews!: EntityTable<Review, 'stepId'>;
  restWeeks!: EntityTable<RestWeek, 'weekStart'>;
  chests!: EntityTable<Chest, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  legacy!: EntityTable<Legacy, 'key'>;

  constructor(name = DB_NAME) {
    super(name);
    // スキーマを変えるときは version(1) を書き換えず version(2) を足す（v1 と同じ決まり）
    this.version(1).stores({
      meta: '&key',
      progress: '&stepId, chapterId, status, clearedAt',
      attempts: '&id, stepId, at',
      drafts: '&stepId, updatedAt',
      sessions: '&id, startedAt, weekStart',
      dex: '&errorId, discoveredAt',
      cards: '&conceptId, rank',
      reviews: '&stepId, due', // 後続（F-REV-1）。表だけ先に作る
      restWeeks: '&weekStart',
      chests: '&id, openedAt',
      notes: '&id, stepId, createdAt', // 後続（F-ASK-4）
      legacy: '&key',
    });
  }
}

export const v2db = new V2Database();
