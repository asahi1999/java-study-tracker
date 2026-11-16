import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { buildLog } from '../../../tests/factories';
import { logRepository } from './logRepository';

describe('logRepository', () => {
  it('getAll は学習日の新しい順に返す', async () => {
    await db.logs.bulkAdd([
      buildLog({ id: 'old', date: '2026-11-16' }),
      buildLog({ id: 'new', date: '2026-11-18' }),
      buildLog({ id: 'mid', date: '2026-11-17' }),
    ]);

    const logs = await logRepository.getAll();

    expect(logs.map((log) => log.id)).toEqual(['new', 'mid', 'old']);
  });

  it('getAll は同じ日のログを記録した時刻の新しい順に返す', async () => {
    await db.logs.bulkAdd([
      buildLog({ id: 'morning', date: '2026-11-16', createdAt: '2026-11-16T00:00:00.000Z' }),
      buildLog({ id: 'night', date: '2026-11-16', createdAt: '2026-11-16T12:00:00.000Z' }),
    ]);

    const logs = await logRepository.getAll();

    expect(logs.map((log) => log.id)).toEqual(['night', 'morning']);
  });

  it('getByWeek はその週のログだけを新しい順に返す', async () => {
    await db.logs.bulkAdd([
      buildLog({ id: 'l1', weekId: 'w1', date: '2026-11-16' }),
      buildLog({ id: 'l2', weekId: 'w1', date: '2026-11-17' }),
      buildLog({ id: 'other', weekId: 'w2', date: '2026-11-18' }),
      buildLog({ id: 'none', weekId: null, date: '2026-11-19' }),
    ]);

    const logs = await logRepository.getByWeek('w1');

    expect(logs.map((log) => log.id)).toEqual(['l2', 'l1']);
  });

  it('add はIDと記録日時を付けて保存する', async () => {
    const added = await logRepository.add({
      date: '2026-11-16',
      minutes: 90,
      weekId: null,
      content: '数当てゲームを作った',
      source: 'timer',
    });

    expect(added.id).not.toBe('');
    expect(Number.isNaN(Date.parse(added.createdAt))).toBe(false);
    expect(await db.logs.get(added.id)).toEqual(added);
  });

  it('update は指定した項目だけを変更する', async () => {
    await db.logs.add(buildLog({ id: 'l1', minutes: 30 }));

    await logRepository.update('l1', { minutes: 45, content: '修正した' });

    expect(await db.logs.get('l1')).toEqual(
      buildLog({ id: 'l1', minutes: 45, content: '修正した' }),
    );
  });

  it('remove はログを削除する', async () => {
    await db.logs.add(buildLog({ id: 'l1' }));

    await logRepository.remove('l1');

    expect(await db.logs.get('l1')).toBeUndefined();
  });
});
