// IndexedDB はテスト環境（jsdom）にないので、メモリ上の実装に差し替える。
// db を読み込むより先に実行する必要があるため、必ず先頭に置く
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { db } from '@/db/database';

// テスト同士が影響しないよう、毎回すべてのテーブルを空にする
beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

afterEach(() => {
  cleanup();
});
