import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from './initialRoadmap';

describe('createInitialRoadmap', () => {
  it('3ヶ月・8ステップ・10週・40チェック項目を作る', () => {
    const roadmap = createInitialRoadmap();

    expect(roadmap.months).toHaveLength(3);
    expect(roadmap.steps).toHaveLength(8);
    expect(roadmap.weeks).toHaveLength(10);
    expect(roadmap.skills).toHaveLength(40);
  });

  it('IDが重複しない', () => {
    const roadmap = createInitialRoadmap();
    const ids = [
      ...roadmap.months.map((month) => month.id),
      ...roadmap.steps.map((step) => step.id),
      ...roadmap.weeks.map((week) => week.id),
      ...roadmap.skills.map((skill) => skill.id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('すべての週が存在する月とステップに属している', () => {
    const roadmap = createInitialRoadmap();
    const monthIds = new Set(roadmap.months.map((month) => month.id));
    const stepIds = new Set(roadmap.steps.map((step) => step.id));

    for (const week of roadmap.weeks) {
      expect(monthIds.has(week.monthId)).toBe(true);
      expect(stepIds.has(week.stepId)).toBe(true);
    }
  });

  it('すべてのチェック項目が存在する週に属し、どの週にも1件以上ある', () => {
    const roadmap = createInitialRoadmap();
    const weekIds = new Set(roadmap.weeks.map((week) => week.id));

    for (const skill of roadmap.skills) {
      expect(weekIds.has(skill.weekId)).toBe(true);
    }
    for (const week of roadmap.weeks) {
      expect(roadmap.skills.some((skill) => skill.weekId === week.id)).toBe(true);
    }
  });

  it('1〜12週目がすべてどこかの週に含まれる', () => {
    const roadmap = createInitialRoadmap();

    for (let weekNumber = 1; weekNumber <= 12; weekNumber++) {
      const covered = roadmap.weeks.some(
        (week) => week.weekStart <= weekNumber && weekNumber <= week.weekEnd,
      );
      expect(covered).toBe(true);
    }
  });

  it('11週目はステップ⑦と⑧が並行する', () => {
    const roadmap = createInitialRoadmap();
    const inWeek11 = roadmap.weeks.filter((week) => week.weekStart <= 11 && 11 <= week.weekEnd);

    expect(inWeek11.map((week) => week.stepId)).toEqual(['step-7', 'step-8']);
  });

  it('予定時間の合計は 12週 × 9時間 = 108時間 になる', () => {
    const roadmap = createInitialRoadmap();
    const total = roadmap.weeks.reduce((sum, week) => sum + week.plannedHours, 0);

    expect(total).toBe(108);
  });

  it('週の表示順は 1 からの連番になる', () => {
    const roadmap = createInitialRoadmap();

    expect(roadmap.weeks.map((week) => week.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('すべて未着手・未チェックの状態で作る', () => {
    const roadmap = createInitialRoadmap();

    expect(roadmap.weeks.every((week) => week.status === 'not_started')).toBe(true);
    expect(roadmap.weeks.every((week) => week.startedAt === null)).toBe(true);
    expect(roadmap.skills.every((skill) => !skill.checked && skill.checkedAt === null)).toBe(true);
  });

  it('呼ぶたびに新しいオブジェクトを返し、変更が次の呼び出しに影響しない', () => {
    const first = createInitialRoadmap();
    first.months[0]!.title = '変更した';
    first.weeks[0]!.status = 'done';
    first.skills[0]!.checked = true;

    const second = createInitialRoadmap();

    expect(second.months[0]!.title).toBe('1ヶ月目');
    expect(second.weeks[0]!.status).toBe('not_started');
    expect(second.skills[0]!.checked).toBe(false);
  });
});
