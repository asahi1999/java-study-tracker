import { describe, expect, it } from 'vitest';

import { v2db } from './database';
import { getDraft, saveDraft } from './drafts';
import { getMeta, saveJavaSupport, touchApp } from './meta';
import { markCleared, markOpened, markTrying, recordAttempt, recordHint } from './progress';

const FILL = { id: 'ch00.sign', chapter: 0, type: 'fill' as const, rev: 2 };
const CARD = { id: 'ch00.hello', chapter: 0, type: 'card' as const, rev: 1 };

describe('v2 の DB（設計書 3-1）', () => {
  it('全表を version(1) で定義する', () => {
    expect(v2db.name).toBe('java-study-tracker-v2');
    expect(v2db.verno).toBe(1);
    expect(v2db.tables.map((t) => t.name).sort()).toEqual([
      'attempts',
      'cards',
      'chests',
      'dex',
      'drafts',
      'legacy',
      'meta',
      'notes',
      'progress',
      'restWeeks',
      'reviews',
      'sessions',
    ]);
  });
});

describe('progress（設計書 3-2・9-1）', () => {
  it('開いただけでは new のまま。最初と最後に開いた時刻を残す', async () => {
    await markOpened(FILL, '2026-12-01T10:00:00.000Z');
    const p = await markOpened(FILL, '2026-12-01T11:00:00.000Z');
    expect(p).toMatchObject({
      status: 'new',
      chapterId: 'ch00',
      kind: 'problem',
      firstOpenedAt: '2026-12-01T10:00:00.000Z',
      lastOpenedAt: '2026-12-01T11:00:00.000Z',
    });
  });

  it('コードを変えたら trying', async () => {
    expect((await markTrying(FILL)).status).toBe('trying');
  });

  it('失敗の試行は trying にして回数を数え、合格でクリア（点は種類で決まる。9-2）', async () => {
    const failed = await recordAttempt(
      FILL,
      { result: 'fail', passed: 0, total: 1, where: 'browser', durationMs: 12 },
      '2026-12-01T10:00:00.000Z',
    );
    expect(failed).toMatchObject({ status: 'trying', attemptCount: 1, points: 0 });
    const passed = await recordAttempt(
      FILL,
      { result: 'pass', passed: 1, total: 1, where: 'browser', durationMs: 10 },
      '2026-12-01T10:05:00.000Z',
    );
    expect(passed).toMatchObject({
      status: 'cleared',
      attemptCount: 2,
      clearedAt: '2026-12-01T10:05:00.000Z',
      clearedRev: 2,
      points: 3,
    });
    const attempts = await v2db.attempts.where('stepId').equals(FILL.id).sortBy('at');
    expect(attempts.map((a) => a.result)).toEqual(['fail', 'pass']);
    expect(attempts[0]).toMatchObject({ rev: 2, where: 'browser', errorIds: [] });
  });

  it('クリアしたあとの試行では、クリアの時刻と点を変えない', async () => {
    await recordAttempt(
      FILL,
      { result: 'pass', passed: 1, total: 1, where: 'browser', durationMs: 1 },
      '2026-12-01T10:00:00.000Z',
    );
    const again = await recordAttempt(
      FILL,
      { result: 'fail', passed: 0, total: 1, where: 'browser', durationMs: 1 },
      '2026-12-02T10:00:00.000Z',
    );
    expect(again).toMatchObject({
      status: 'cleared',
      clearedAt: '2026-12-01T10:00:00.000Z',
      points: 3,
    });
  });

  it('説明カードの「わかった」は 1点、ヒントは使った最高の段', async () => {
    expect(await markCleared(CARD, '2026-12-01T10:00:00.000Z')).toMatchObject({
      kind: 'card',
      status: 'cleared',
      points: 1,
    });
    await recordHint(FILL, 2);
    expect((await recordHint(FILL, 1)).maxHint).toBe(2);
  });
});

describe('drafts・meta', () => {
  it('書きかけを保存して読む', async () => {
    await saveDraft({
      stepId: FILL.id,
      rev: 2,
      files: { 'Main.java': 'x' },
      cursorLine: 3,
      updatedAt: '2026-12-01T10:00:00.000Z',
    });
    expect((await getDraft(FILL.id))?.files['Main.java']).toBe('x');
  });

  it('meta.app は最初の createdAt を残し、lastActiveAt を進める', async () => {
    await touchApp('2026-12-01T10:00:00.000Z', '2026.12.01-1');
    const app = await touchApp('2026-12-03T10:00:00.000Z', '2026.12.02-1');
    expect(app).toMatchObject({
      createdAt: '2026-12-01T10:00:00.000Z',
      lastActiveAt: '2026-12-03T10:00:00.000Z',
      lastContentVersion: '2026.12.02-1',
    });
    await saveJavaSupport('unsupported', '2026-12-01T10:00:00.000Z', 'WasmGC なし');
    expect(await getMeta('java')).toMatchObject({ support: 'unsupported', detail: 'WasmGC なし' });
  });
});
