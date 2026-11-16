import { describe, expect, it } from 'vitest';

import { buildLog, buildSkill, buildWeek } from '../../tests/factories';
import {
  canCompleteWeek,
  getAutoStartChanges,
  getCompleteChanges,
  getReopenChanges,
  isChecklistLocked,
} from './weekStatus';

const TODAY = '2026-11-20';

describe('getAutoStartChanges', () => {
  const week = buildWeek({ id: 'w1', status: 'not_started', startedAt: null });

  it('チェックもログもなければ何も変えない', () => {
    const skills = [buildSkill({ weekId: 'w1', checked: false })];

    expect(getAutoStartChanges(week, skills, [], TODAY)).toBeNull();
  });

  it('チェック済みの項目が1つあれば「進行中」にし、開始日を入れる', () => {
    const skills = [
      buildSkill({ id: 's1', weekId: 'w1', checked: true, checkedAt: TODAY }),
      buildSkill({ id: 's2', weekId: 'w1', checked: false }),
    ];

    expect(getAutoStartChanges(week, skills, [], TODAY)).toEqual({
      status: 'in_progress',
      startedAt: TODAY,
    });
  });

  it('学習ログが1件あれば「進行中」にする', () => {
    const logs = [buildLog({ weekId: 'w1', date: TODAY })];

    expect(getAutoStartChanges(week, [], logs, TODAY)).toEqual({
      status: 'in_progress',
      startedAt: TODAY,
    });
  });

  it('過去の日付でログを足した場合は、そのログの日付を開始日にする', () => {
    const logs = [buildLog({ weekId: 'w1', date: '2026-11-18' })];

    expect(getAutoStartChanges(week, [], logs, TODAY)?.startedAt).toBe('2026-11-18');
  });

  it('記録が複数あれば、いちばん早い日付を開始日にする', () => {
    const skills = [buildSkill({ weekId: 'w1', checked: true, checkedAt: '2026-11-19' })];
    const logs = [
      buildLog({ id: 'l1', weekId: 'w1', date: '2026-11-19' }),
      buildLog({ id: 'l2', weekId: 'w1', date: '2026-11-17' }),
    ];

    expect(getAutoStartChanges(week, skills, logs, TODAY)?.startedAt).toBe('2026-11-17');
  });

  it('未来の日付の記録しかなくても、開始日は今日より先にしない', () => {
    const logs = [buildLog({ weekId: 'w1', date: '2026-12-01' })];

    expect(getAutoStartChanges(week, [], logs, TODAY)?.startedAt).toBe(TODAY);
  });

  it('チェックした日が記録されていない項目は、今日を開始日にする', () => {
    const skills = [buildSkill({ weekId: 'w1', checked: true, checkedAt: null })];

    expect(getAutoStartChanges(week, skills, [], TODAY)?.startedAt).toBe(TODAY);
  });

  it('ほかの週のチェックやログでは変えない', () => {
    const skills = [buildSkill({ weekId: 'w2', checked: true, checkedAt: TODAY })];
    const logs = [buildLog({ weekId: 'w2' }), buildLog({ id: 'l2', weekId: null })];

    expect(getAutoStartChanges(week, skills, logs, TODAY)).toBeNull();
  });

  it('すでに開始日が入っていれば、その日付を残す', () => {
    const started = buildWeek({ id: 'w1', status: 'not_started', startedAt: '2026-11-10' });
    const logs = [buildLog({ weekId: 'w1', date: TODAY })];

    expect(getAutoStartChanges(started, [], logs, TODAY)).toEqual({
      status: 'in_progress',
      startedAt: '2026-11-10',
    });
  });

  it('すでに進行中・完成の週は変えない', () => {
    const logs = [buildLog({ weekId: 'w1' })];

    expect(
      getAutoStartChanges(buildWeek({ id: 'w1', status: 'in_progress' }), [], logs, TODAY),
    ).toBeNull();
    expect(
      getAutoStartChanges(buildWeek({ id: 'w1', status: 'done' }), [], logs, TODAY),
    ).toBeNull();
  });
});

describe('canCompleteWeek', () => {
  const week = buildWeek({ id: 'w1', status: 'in_progress' });

  it('すべての項目がチェック済みなら完成にできる', () => {
    const skills = [
      buildSkill({ id: 's1', weekId: 'w1', checked: true }),
      buildSkill({ id: 's2', weekId: 'w1', checked: true }),
    ];

    expect(canCompleteWeek(week, skills)).toBe(true);
  });

  it('1つでも未チェックの項目があれば完成にできない', () => {
    const skills = [
      buildSkill({ id: 's1', weekId: 'w1', checked: true }),
      buildSkill({ id: 's2', weekId: 'w1', checked: false }),
    ];

    expect(canCompleteWeek(week, skills)).toBe(false);
  });

  it('項目が0件の週は完成にできる', () => {
    expect(canCompleteWeek(week, [])).toBe(true);
  });

  it('ほかの週の未チェックの項目は関係ない', () => {
    const skills = [
      buildSkill({ id: 's1', weekId: 'w1', checked: true }),
      buildSkill({ id: 's2', weekId: 'w2', checked: false }),
    ];

    expect(canCompleteWeek(week, skills)).toBe(true);
  });

  it('未着手の週でも、条件を満たせば完成にできる', () => {
    expect(canCompleteWeek(buildWeek({ id: 'w1', status: 'not_started' }), [])).toBe(true);
  });

  it('すでに完成している週は、もう一度完成にはできない', () => {
    const skills = [buildSkill({ weekId: 'w1', checked: true })];

    expect(canCompleteWeek(buildWeek({ id: 'w1', status: 'done' }), skills)).toBe(false);
  });
});

describe('getCompleteChanges', () => {
  it('「完成」にして、完了日を今日にする', () => {
    const week = buildWeek({ status: 'in_progress', startedAt: '2026-11-16' });

    expect(getCompleteChanges(week, TODAY)).toEqual({
      status: 'done',
      completedAt: TODAY,
      startedAt: '2026-11-16',
    });
  });

  it('開始日が空なら、今日を開始日にも入れる', () => {
    const week = buildWeek({ status: 'not_started', startedAt: null });

    expect(getCompleteChanges(week, TODAY).startedAt).toBe(TODAY);
  });
});

describe('getReopenChanges', () => {
  it('「進行中」に戻して、完了日を消す', () => {
    expect(getReopenChanges()).toEqual({ status: 'in_progress', completedAt: null });
  });

  it('開始日は変更しない', () => {
    expect(getReopenChanges()).not.toHaveProperty('startedAt');
  });
});

describe('isChecklistLocked', () => {
  it('完成中はチェックリストを変更できない', () => {
    expect(isChecklistLocked({ status: 'done' })).toBe(true);
  });

  it('未着手・進行中は変更できる', () => {
    expect(isChecklistLocked({ status: 'not_started' })).toBe(false);
    expect(isChecklistLocked({ status: 'in_progress' })).toBe(false);
  });
});
