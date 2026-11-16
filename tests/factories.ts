import type { Skill, StudyLog, Week } from '@/types';

// テストで使うデータを作る関数。テストに関係する項目だけ overrides で指定する

export function buildWeek(overrides: Partial<Week> = {}): Week {
  return {
    id: 'week-test',
    order: 1,
    monthId: 'month-1',
    stepId: 'step-1',
    weekStart: 1,
    weekEnd: 1,
    title: 'テスト用の週',
    plannedHours: 9,
    status: 'not_started',
    repoUrl: '',
    startedAt: null,
    completedAt: null,
    memo: '',
    ...overrides,
  };
}

export function buildSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'skill-test',
    weekId: 'week-test',
    order: 1,
    label: 'テスト用の項目',
    checked: false,
    checkedAt: null,
    ...overrides,
  };
}

export function buildLog(overrides: Partial<StudyLog> = {}): StudyLog {
  return {
    id: 'log-test',
    date: '2026-11-16',
    minutes: 60,
    weekId: 'week-test',
    content: 'テスト用のログ',
    source: 'manual',
    createdAt: '2026-11-16T10:00:00.000Z',
    ...overrides,
  };
}
