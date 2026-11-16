import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { buildLog, buildSkill, buildWeek } from '../../../tests/factories';
import { weekRepository } from './weekRepository';

describe('weekRepository', () => {
  it('getAll は表示順に並べて返す', async () => {
    await db.weeks.bulkAdd([
      buildWeek({ id: 'w2', order: 2 }),
      buildWeek({ id: 'w3', order: 3 }),
      buildWeek({ id: 'w1', order: 1 }),
    ]);

    const weeks = await weekRepository.getAll();

    expect(weeks.map((week) => week.id)).toEqual(['w1', 'w2', 'w3']);
  });

  it('getById は存在しないIDなら undefined を返す', async () => {
    expect(await weekRepository.getById('none')).toBeUndefined();
  });

  it('add はIDを発行して保存する', async () => {
    const { id: originalId, ...input } = buildWeek({ title: '追加した週' });

    const added = await weekRepository.add(input);

    expect(added.id).not.toBe('');
    expect(added.id).not.toBe(originalId);
    expect(await weekRepository.getById(added.id)).toEqual(added);
  });

  it('update は指定した項目だけを変更する', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));

    await weekRepository.update('w1', {
      status: 'done',
      completedAt: '2026-11-22',
      repoUrl: 'https://github.com/asahi1999/number-guess',
    });

    expect(await weekRepository.getById('w1')).toEqual(
      buildWeek({
        id: 'w1',
        status: 'done',
        completedAt: '2026-11-22',
        repoUrl: 'https://github.com/asahi1999/number-guess',
      }),
    );
  });

  describe('remove', () => {
    it('週と、その週のチェック項目を削除する', async () => {
      await db.weeks.add(buildWeek({ id: 'w1' }));
      await db.skills.bulkAdd([
        buildSkill({ id: 's1', weekId: 'w1' }),
        buildSkill({ id: 's2', weekId: 'w1' }),
      ]);

      await weekRepository.remove('w1');

      expect(await weekRepository.getById('w1')).toBeUndefined();
      expect(await db.skills.count()).toBe(0);
    });

    it('学習ログは削除せず、週との紐づけだけを外す', async () => {
      await db.weeks.add(buildWeek({ id: 'w1' }));
      await db.logs.add(buildLog({ id: 'l1', weekId: 'w1', minutes: 45 }));

      await weekRepository.remove('w1');

      expect(await db.logs.get('l1')).toEqual(buildLog({ id: 'l1', weekId: null, minutes: 45 }));
    });

    it('ほかの週のチェック項目とログには影響しない', async () => {
      await db.weeks.bulkAdd([
        buildWeek({ id: 'w1', order: 1 }),
        buildWeek({ id: 'w2', order: 2 }),
      ]);
      await db.skills.add(buildSkill({ id: 's2', weekId: 'w2' }));
      await db.logs.add(buildLog({ id: 'l2', weekId: 'w2' }));

      await weekRepository.remove('w1');

      expect(await weekRepository.getById('w2')).toBeDefined();
      expect(await db.skills.get('s2')).toBeDefined();
      expect((await db.logs.get('l2'))?.weekId).toBe('w2');
    });
  });
});
