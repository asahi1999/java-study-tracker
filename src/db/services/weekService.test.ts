import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { buildLog, buildSkill, buildWeek } from '../../../tests/factories';
import { ChecklistLockedError, WeekNotCompletableError } from './errors';
import { weekService } from './weekService';

const TODAY = '2026-11-18';

/** 項目が2つある未着手の週を用意する */
async function seedWeek(overrides: Parameters<typeof buildWeek>[0] = {}) {
  await db.weeks.add(buildWeek({ id: 'w1', ...overrides }));
  await db.skills.bulkAdd([
    buildSkill({ id: 's1', weekId: 'w1', order: 1 }),
    buildSkill({ id: 's2', weekId: 'w1', order: 2 }),
  ]);
}

describe('weekService.setSkillChecked', () => {
  it('項目をチェック済みにして、チェックした日を記録する', async () => {
    await seedWeek();

    await weekService.setSkillChecked('s1', true, TODAY);

    expect(await db.skills.get('s1')).toMatchObject({ checked: true, checkedAt: TODAY });
    expect(await db.skills.get('s2')).toMatchObject({ checked: false, checkedAt: null });
  });

  it('未着手の週で最初の項目をチェックすると、週を「進行中」にして開始日を入れる', async () => {
    await seedWeek();

    await weekService.setSkillChecked('s1', true, TODAY);

    expect(await db.weeks.get('w1')).toMatchObject({ status: 'in_progress', startedAt: TODAY });
  });

  it('先に過去の日付のログがあれば、開始日はそのログの日付になる', async () => {
    await seedWeek();
    await db.logs.add(buildLog({ weekId: 'w1', date: '2026-11-16' }));

    await weekService.setSkillChecked('s1', true, TODAY);

    expect((await db.weeks.get('w1'))?.startedAt).toBe('2026-11-16');
  });

  it('チェックを外すと、チェックした日も消す', async () => {
    await seedWeek();
    await weekService.setSkillChecked('s1', true, TODAY);

    await weekService.setSkillChecked('s1', false, '2026-11-19');

    expect(await db.skills.get('s1')).toMatchObject({ checked: false, checkedAt: null });
  });

  it('チェックをすべて外しても、週を「未着手」には戻さない', async () => {
    await seedWeek();
    await weekService.setSkillChecked('s1', true, TODAY);

    await weekService.setSkillChecked('s1', false, TODAY);

    expect(await db.weeks.get('w1')).toMatchObject({ status: 'in_progress', startedAt: TODAY });
  });

  it('すでに進行中の週の開始日は変えない', async () => {
    await seedWeek({ status: 'in_progress', startedAt: '2026-11-16' });

    await weekService.setSkillChecked('s1', true, TODAY);

    expect((await db.weeks.get('w1'))?.startedAt).toBe('2026-11-16');
  });

  it('完成にした週のチェックは変更できず、データも変わらない', async () => {
    await seedWeek({ status: 'done', completedAt: '2026-11-17' });

    await expect(weekService.setSkillChecked('s1', true, TODAY)).rejects.toBeInstanceOf(
      ChecklistLockedError,
    );
    expect((await db.skills.get('s1'))?.checked).toBe(false);
  });

  it('ほかの週の状態は変えない', async () => {
    await seedWeek();
    await db.weeks.add(buildWeek({ id: 'w2', order: 2 }));

    await weekService.setSkillChecked('s1', true, TODAY);

    expect((await db.weeks.get('w2'))?.status).toBe('not_started');
  });

  it('存在しない項目を指定しても何もしない', async () => {
    await seedWeek();

    await expect(weekService.setSkillChecked('none', true, TODAY)).resolves.toBeUndefined();
    expect((await db.weeks.get('w1'))?.status).toBe('not_started');
  });
});

describe('weekService.complete', () => {
  it('すべての項目がチェック済みなら「完成」にして完了日を入れる', async () => {
    await seedWeek();
    await weekService.setSkillChecked('s1', true, '2026-11-17');
    await weekService.setSkillChecked('s2', true, TODAY);

    await weekService.complete('w1', TODAY);

    expect(await db.weeks.get('w1')).toMatchObject({
      status: 'done',
      startedAt: '2026-11-17',
      completedAt: TODAY,
    });
  });

  it('チェックしていない項目が残っていれば完成にできず、状態も変わらない', async () => {
    await seedWeek();
    await weekService.setSkillChecked('s1', true, TODAY);

    await expect(weekService.complete('w1', TODAY)).rejects.toBeInstanceOf(WeekNotCompletableError);
    expect(await db.weeks.get('w1')).toMatchObject({ status: 'in_progress', completedAt: null });
  });

  it('項目が0件の週は完成にでき、開始日にも今日が入る', async () => {
    await db.weeks.add(buildWeek({ id: 'empty' }));

    await weekService.complete('empty', TODAY);

    expect(await db.weeks.get('empty')).toMatchObject({
      status: 'done',
      startedAt: TODAY,
      completedAt: TODAY,
    });
  });

  it('すでに完成している週をもう一度完成にしようとするとエラーになり、完了日は変わらない', async () => {
    await db.weeks.add(buildWeek({ id: 'w1', status: 'done', completedAt: '2026-11-17' }));

    await expect(weekService.complete('w1', TODAY)).rejects.toBeInstanceOf(WeekNotCompletableError);
    expect((await db.weeks.get('w1'))?.completedAt).toBe('2026-11-17');
  });
});

describe('weekService.reopen', () => {
  it('完成を取り消して「進行中」に戻し、完了日を消す', async () => {
    await db.weeks.add(
      buildWeek({ id: 'w1', status: 'done', startedAt: '2026-11-16', completedAt: '2026-11-17' }),
    );

    await weekService.reopen('w1');

    expect(await db.weeks.get('w1')).toMatchObject({
      status: 'in_progress',
      startedAt: '2026-11-16',
      completedAt: null,
    });
  });

  it('取り消したあとは、チェックをまた変更できる', async () => {
    await seedWeek({ status: 'done', completedAt: '2026-11-17' });

    await weekService.reopen('w1');
    await weekService.setSkillChecked('s1', true, TODAY);

    expect((await db.skills.get('s1'))?.checked).toBe(true);
  });

  it('完成していない週には何もしない', async () => {
    await db.weeks.add(buildWeek({ id: 'w1', status: 'not_started' }));

    await weekService.reopen('w1');

    expect((await db.weeks.get('w1'))?.status).toBe('not_started');
  });
});
