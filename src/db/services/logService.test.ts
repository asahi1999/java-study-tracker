import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { buildWeek } from '../../../tests/factories';
import { logService } from './logService';

const TODAY = '2026-11-18';

const input = (overrides = {}) => ({
  date: TODAY,
  minutes: 45,
  weekId: 'w1' as string | null,
  content: 'for文の練習',
  source: 'manual' as const,
  ...overrides,
});

describe('logService.add', () => {
  it('学習ログを保存し、IDと記録した日時を付けて返す', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));

    const log = await logService.add(input(), TODAY);

    expect(log.id).not.toBe('');
    expect(log.createdAt).not.toBe('');
    expect(await db.logs.get(log.id)).toMatchObject({ date: TODAY, minutes: 45, weekId: 'w1' });
  });

  it('未着手の週にログを足すと、週を「進行中」にして開始日を入れる', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));

    await logService.add(input(), TODAY);

    expect(await db.weeks.get('w1')).toMatchObject({ status: 'in_progress', startedAt: TODAY });
  });

  it('過去の日付のログを足すと、開始日はそのログの日付になる', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));

    await logService.add(input({ date: '2026-11-16' }), TODAY);

    expect((await db.weeks.get('w1'))?.startedAt).toBe('2026-11-16');
  });

  it('進行中の週の開始日は変えない', async () => {
    await db.weeks.add(buildWeek({ id: 'w1', status: 'in_progress', startedAt: '2026-11-17' }));

    await logService.add(input({ date: '2026-11-10' }), TODAY);

    expect(await db.weeks.get('w1')).toMatchObject({
      status: 'in_progress',
      startedAt: '2026-11-17',
    });
  });

  it('完成した週にログを足しても、状態は変えない', async () => {
    await db.weeks.add(
      buildWeek({ id: 'w1', status: 'done', startedAt: '2026-11-16', completedAt: '2026-11-17' }),
    );

    await logService.add(input(), TODAY);

    expect(await db.weeks.get('w1')).toMatchObject({ status: 'done', completedAt: '2026-11-17' });
  });

  it('週の指定がないログは、どの週の状態も変えない', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));

    await logService.add(input({ weekId: null }), TODAY);

    expect((await db.weeks.get('w1'))?.status).toBe('not_started');
    expect(await db.logs.count()).toBe(1);
  });

  it('存在しない週を指定しても、ログは保存する', async () => {
    await logService.add(input({ weekId: 'deleted-week' }), TODAY);

    expect(await db.logs.count()).toBe(1);
  });
});

describe('logService.update', () => {
  it('学習ログの内容を書き換える', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));
    const log = await logService.add(input(), TODAY);

    await logService.update(log.id, { minutes: 90, content: '書き直し' }, TODAY);

    expect(await db.logs.get(log.id)).toMatchObject({
      minutes: 90,
      content: '書き直し',
      source: 'manual',
      createdAt: log.createdAt,
    });
  });

  it('未着手の週に付け替えると、その週を「進行中」にする', async () => {
    await db.weeks.bulkAdd([buildWeek({ id: 'w1' }), buildWeek({ id: 'w2', order: 2 })]);
    const log = await logService.add(input(), TODAY);

    await logService.update(log.id, { weekId: 'w2' }, TODAY);

    expect(await db.weeks.get('w2')).toMatchObject({ status: 'in_progress', startedAt: TODAY });
  });

  it('付け替える前の週は、ログがなくなっても「未着手」に戻さない', async () => {
    await db.weeks.bulkAdd([buildWeek({ id: 'w1' }), buildWeek({ id: 'w2', order: 2 })]);
    const log = await logService.add(input(), TODAY);

    await logService.update(log.id, { weekId: 'w2' }, TODAY);

    expect((await db.weeks.get('w1'))?.status).toBe('in_progress');
  });

  it('「週の指定なし」に変えられる', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));
    const log = await logService.add(input(), TODAY);

    await logService.update(log.id, { weekId: null }, TODAY);

    expect((await db.logs.get(log.id))?.weekId).toBeNull();
  });
});

describe('logService.remove', () => {
  it('学習ログを削除する', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));
    const log = await logService.add(input(), TODAY);

    await logService.remove(log.id);

    expect(await db.logs.count()).toBe(0);
  });

  it('ログをすべて削除しても、週を「未着手」には戻さない', async () => {
    await db.weeks.add(buildWeek({ id: 'w1' }));
    const log = await logService.add(input(), TODAY);

    await logService.remove(log.id);

    expect(await db.weeks.get('w1')).toMatchObject({ status: 'in_progress', startedAt: TODAY });
  });
});
