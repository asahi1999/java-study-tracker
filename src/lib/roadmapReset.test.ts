import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';

import { mergeProgressIntoInitial } from './roadmapReset';

describe('mergeProgressIntoInitial', () => {
  it('同じIDの週は、進捗（状態・URL・日付・メモ）だけを引き継ぎ、名前や予定は初期データに戻す', () => {
    const initial = createInitialRoadmap();
    const edited = {
      ...initial.weeks[0]!,
      title: '名前を変えた週',
      weekStart: 3,
      weekEnd: 4,
      plannedHours: 20,
      order: 99,
      status: 'done' as const,
      repoUrl: 'https://github.com/example/guess',
      startedAt: '2026-11-16',
      completedAt: '2026-11-20',
      memo: 'メモ',
    };

    const result = mergeProgressIntoInitial(initial, { weeks: [edited], skills: [] });

    expect(result.weeks[0]).toEqual({
      ...initial.weeks[0],
      status: 'done',
      repoUrl: 'https://github.com/example/guess',
      startedAt: '2026-11-16',
      completedAt: '2026-11-20',
      memo: 'メモ',
    });
    // ほかの週は初期データのまま
    expect(result.weeks.slice(1)).toEqual(initial.weeks.slice(1));
  });

  it('同じIDの項目は、チェックの状態を引き継ぎ、名前は初期データに戻す', () => {
    const initial = createInitialRoadmap();
    const skill = initial.skills[0]!;
    const edited = {
      ...skill,
      label: '名前を変えた項目',
      order: 50,
      checked: true,
      checkedAt: '2026-11-17',
    };

    const result = mergeProgressIntoInitial(initial, { weeks: [], skills: [edited] });

    expect(result.skills[0]).toEqual({ ...skill, checked: true, checkedAt: '2026-11-17' });
  });

  it('追加した週・項目は含めない', () => {
    const initial = createInitialRoadmap();
    const addedWeek = { ...initial.weeks[0]!, id: 'added-week' };
    const addedSkill = { ...initial.skills[0]!, id: 'added-skill', weekId: 'added-week' };

    const result = mergeProgressIntoInitial(initial, { weeks: [addedWeek], skills: [addedSkill] });

    expect(result.weeks.map((week) => week.id)).toEqual(initial.weeks.map((week) => week.id));
    expect(result.skills.map((skill) => skill.id)).toEqual(initial.skills.map((skill) => skill.id));
  });

  it('同じIDでも別の週の項目になっているものは、チェックを引き継がない', () => {
    const initial = createInitialRoadmap();
    const skill = initial.skills[0]!;
    const moved = { ...skill, weekId: 'other-week', checked: true, checkedAt: '2026-11-17' };

    const result = mergeProgressIntoInitial(initial, { weeks: [], skills: [moved] });

    expect(result.skills[0]).toEqual(skill);
  });

  it('月とステップは初期データに戻す', () => {
    const initial = createInitialRoadmap();
    const result = mergeProgressIntoInitial(initial, { weeks: [], skills: [] });

    expect(result.months).toEqual(initial.months);
    expect(result.steps).toEqual(initial.steps);
  });
});
