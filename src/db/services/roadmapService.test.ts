import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';
import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';

import { buildLog, buildSkill, buildWeek } from '../../../tests/factories';
import { roadmapService } from './roadmapService';

async function weekOrder(): Promise<string[]> {
  return (await db.weeks.orderBy('order').toArray()).map((week) => week.id);
}

describe('roadmapService.addMonth / addStep', () => {
  it('末尾の次の表示順で足す', async () => {
    await db.months.bulkAdd([
      { id: 'm1', order: 1, title: '1ヶ月目', milestone: '' },
      { id: 'm2', order: 4, title: '2ヶ月目', milestone: '' },
    ]);

    const month = await roadmapService.addMonth({ title: '3ヶ月目', milestone: '公開する' });

    expect(await db.months.get(month.id)).toEqual({
      id: month.id,
      order: 5,
      title: '3ヶ月目',
      milestone: '公開する',
    });
  });

  it('ステップは1件もなければ①から始まる', async () => {
    const step = await roadmapService.addStep({ title: 'Docker', description: '', advice: '' });
    expect(step.order).toBe(1);
  });
});

describe('roadmapService.addWeek', () => {
  it('未着手・進捗なしの週を末尾に足す', async () => {
    await db.weeks.add(buildWeek({ id: 'w1', order: 3 }));

    const week = await roadmapService.addWeek({
      title: '電卓アプリ',
      monthId: 'month-1',
      stepId: 'step-3',
      weekStart: 13,
      weekEnd: 13,
      plannedHours: 9,
    });

    expect(await db.weeks.get(week.id)).toEqual({
      id: week.id,
      order: 4,
      title: '電卓アプリ',
      monthId: 'month-1',
      stepId: 'step-3',
      weekStart: 13,
      weekEnd: 13,
      plannedHours: 9,
      status: 'not_started',
      repoUrl: '',
      startedAt: null,
      completedAt: null,
      memo: '',
    });
  });
});

describe('roadmapService.moveWeek', () => {
  it('表示順だけを入れ替え、週番号は変えない', async () => {
    await db.weeks.bulkAdd([
      buildWeek({ id: 'a', order: 1, weekStart: 1, weekEnd: 1 }),
      buildWeek({ id: 'b', order: 2, weekStart: 2, weekEnd: 2 }),
      buildWeek({ id: 'c', order: 3, weekStart: 3, weekEnd: 3 }),
    ]);

    await roadmapService.moveWeek('c', 'up');

    expect(await weekOrder()).toEqual(['a', 'c', 'b']);
    expect(await db.weeks.get('c')).toMatchObject({ weekStart: 3, weekEnd: 3 });
  });

  it('先頭の週を上へ動かしても何も変わらない', async () => {
    await db.weeks.bulkAdd([buildWeek({ id: 'a', order: 1 }), buildWeek({ id: 'b', order: 2 })]);

    await roadmapService.moveWeek('a', 'up');

    expect(await weekOrder()).toEqual(['a', 'b']);
  });
});

describe('roadmapService.addSkill / moveSkill', () => {
  it('項目を、その週の末尾に未チェックで足す', async () => {
    await db.skills.bulkAdd([
      buildSkill({ id: 's1', weekId: 'w1', order: 1 }),
      buildSkill({ id: 's2', weekId: 'w1', order: 2 }),
      buildSkill({ id: 'other', weekId: 'w2', order: 9 }),
    ]);

    const skill = await roadmapService.addSkill('w1', 'ラムダ式');

    expect(await db.skills.get(skill.id)).toEqual({
      id: skill.id,
      weekId: 'w1',
      label: 'ラムダ式',
      order: 3,
      checked: false,
      checkedAt: null,
    });
  });

  it('同じ週の中だけで表示順を動かす', async () => {
    await db.skills.bulkAdd([
      buildSkill({ id: 's1', weekId: 'w1', order: 1 }),
      buildSkill({ id: 's2', weekId: 'w1', order: 2 }),
      buildSkill({ id: 'other', weekId: 'w2', order: 1 }),
    ]);

    await roadmapService.moveSkill('s1', 'down');

    expect(await db.skills.get('s1')).toMatchObject({ order: 2 });
    expect(await db.skills.get('s2')).toMatchObject({ order: 1 });
    expect(await db.skills.get('other')).toMatchObject({ order: 1 });
  });

  it('ない項目を動かそうとしても何もしない', async () => {
    await expect(roadmapService.moveSkill('missing', 'up')).resolves.toBeUndefined();
  });
});

describe('roadmapService.resetToInitial', () => {
  /** 初期データに、進捗・編集・追加・ログ・バッジを加えた状態を作る */
  async function seedEdited() {
    await seedIfEmpty('2026-11-16');
    await db.weeks.update('week-01', {
      title: '名前を変えた',
      status: 'done',
      completedAt: '2026-11-20',
      memo: 'メモ',
    });
    await db.skills.update('week-01-skill-1', { checked: true, checkedAt: '2026-11-17' });
    await db.months.update('month-1', { title: '最初の月' });
    await db.weeks.add(buildWeek({ id: 'added', order: 11 }));
    await db.skills.add(buildSkill({ id: 'added-skill', weekId: 'added' }));
    await db.logs.bulkAdd([
      buildLog({ id: 'log-kept', weekId: 'week-01' }),
      buildLog({ id: 'log-added', weekId: 'added' }),
    ]);
    await db.badges.add({ id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' });
  }

  it('残す：同じIDの週・項目の進捗を引き継ぎ、名前や追加分は初期データに戻す', async () => {
    await seedEdited();

    await roadmapService.resetToInitial('keep');

    const initial = createInitialRoadmap();
    expect(await db.months.toArray()).toEqual(initial.months);
    expect(await weekOrder()).toEqual(initial.weeks.map((week) => week.id));
    expect(await db.weeks.get('week-01')).toMatchObject({
      title: '数当てゲーム',
      status: 'done',
      completedAt: '2026-11-20',
      memo: 'メモ',
    });
    expect(await db.skills.get('week-01-skill-1')).toMatchObject({ checked: true });
    expect(await db.skills.get('added-skill')).toBeUndefined();
  });

  it('残す：ログとバッジは残し、消えた週のログは「週の指定なし」にする', async () => {
    await seedEdited();

    await roadmapService.resetToInitial('keep');

    expect(await db.logs.get('log-kept')).toMatchObject({ weekId: 'week-01' });
    expect(await db.logs.get('log-added')).toMatchObject({ weekId: null });
    expect(await db.badges.count()).toBe(1);
  });

  it('消す：進捗・ログ・バッジを消して、初期データだけにする', async () => {
    await seedEdited();

    await roadmapService.resetToInitial('erase');

    const initial = createInitialRoadmap();
    expect(await db.weeks.orderBy('order').toArray()).toEqual(initial.weeks);
    expect(await db.skills.count()).toBe(initial.skills.length);
    expect(await db.logs.count()).toBe(0);
    expect(await db.badges.count()).toBe(0);
  });

  it('どちらでも設定は変えない', async () => {
    await seedEdited();
    await db.settings.update('app', { weeklyGoalHours: 12 });

    await roadmapService.resetToInitial('erase');

    expect(await db.settings.get('app')).toMatchObject({
      startDate: '2026-11-16',
      weeklyGoalHours: 12,
    });
  });
});
