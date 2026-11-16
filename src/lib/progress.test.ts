import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';
import type { RoadmapData } from '@/types';

import { buildSkill, buildWeek } from '../../tests/factories';
import {
  calcProgress,
  getMonthProgress,
  getOverallProgress,
  getStepProgress,
  getWeekProgress,
} from './progress';

/** checked 個がチェック済み、残りが未チェックの項目を total 個作る */
function buildSkills(checked: number, total: number) {
  return Array.from({ length: total }, (_, index) =>
    buildSkill({ id: `skill-${index}`, checked: index < checked }),
  );
}

/** 初期ロードマップのうち、指定した週の項目をすべてチェック済みにする */
function roadmapWithCheckedWeeks(...weekIds: string[]): RoadmapData {
  const roadmap = createInitialRoadmap();
  for (const skill of roadmap.skills) {
    if (weekIds.includes(skill.weekId)) skill.checked = true;
  }
  return roadmap;
}

describe('calcProgress', () => {
  it('項目が0件なら 0% にする', () => {
    expect(calcProgress([])).toEqual({ checked: 0, total: 0, percent: 0 });
  });

  it('1つもチェックしていなければ 0% にする', () => {
    expect(calcProgress(buildSkills(0, 5))).toEqual({ checked: 0, total: 5, percent: 0 });
  });

  it('すべてチェック済みなら 100% にする', () => {
    expect(calcProgress(buildSkills(5, 5))).toEqual({ checked: 5, total: 5, percent: 100 });
  });

  it('チェック済みの数 ÷ 全項目数 を整数のパーセントにする', () => {
    expect(calcProgress(buildSkills(1, 4)).percent).toBe(25);
    expect(calcProgress(buildSkills(3, 7)).percent).toBe(43);
  });

  it('端数は四捨五入する', () => {
    // 15 / 40 = 37.5%
    expect(calcProgress(buildSkills(15, 40)).percent).toBe(38);
    // 1 / 3 = 33.33…%
    expect(calcProgress(buildSkills(1, 3)).percent).toBe(33);
  });

  it('1つでも残っていれば、四捨五入で 100% になる場合でも 99% にとどめる', () => {
    // 199 / 200 = 99.5%
    expect(calcProgress(buildSkills(199, 200)).percent).toBe(99);
  });

  it('1つでもチェックしていれば、四捨五入で 0% になる場合でも 1% にする', () => {
    // 1 / 400 = 0.25%
    expect(calcProgress(buildSkills(1, 400)).percent).toBe(1);
  });
});

describe('getOverallProgress', () => {
  it('初期状態は 0 / 40 項目で 0%', () => {
    const { skills } = createInitialRoadmap();

    expect(getOverallProgress(skills)).toEqual({ checked: 0, total: 40, percent: 0 });
  });

  it('すべての週の項目をまとめて数える', () => {
    const { skills } = roadmapWithCheckedWeeks('week-01', 'week-08');

    // 1週目は6項目、8週目は2項目
    expect(getOverallProgress(skills)).toEqual({ checked: 8, total: 40, percent: 20 });
  });
});

describe('getWeekProgress', () => {
  it('その週の項目だけを数える', () => {
    const skills = [
      buildSkill({ id: 's1', weekId: 'w1', checked: true }),
      buildSkill({ id: 's2', weekId: 'w1', checked: false }),
      buildSkill({ id: 's3', weekId: 'w2', checked: true }),
    ];

    expect(getWeekProgress('w1', skills)).toEqual({ checked: 1, total: 2, percent: 50 });
  });

  it('項目のない週は 0% にする', () => {
    expect(getWeekProgress('none', [buildSkill({ weekId: 'w1', checked: true })])).toEqual({
      checked: 0,
      total: 0,
      percent: 0,
    });
  });
});

describe('getMonthProgress', () => {
  it('その月に属する週の項目をまとめて数える', () => {
    const { weeks, skills } = roadmapWithCheckedWeeks('week-01');

    // 1ヶ月目は 6 + 3 + 3 + 3 = 15項目
    expect(getMonthProgress('month-1', weeks, skills)).toEqual({
      checked: 6,
      total: 15,
      percent: 40,
    });
  });

  it('ほかの月の進捗は含めない', () => {
    const { weeks, skills } = roadmapWithCheckedWeeks('week-01');

    expect(getMonthProgress('month-2', weeks, skills)).toEqual({
      checked: 0,
      total: 15,
      percent: 0,
    });
  });

  it('月の週がすべて終われば 100% になる', () => {
    const { weeks, skills } = roadmapWithCheckedWeeks('week-01', 'week-02', 'week-03', 'week-04');

    expect(getMonthProgress('month-1', weeks, skills).percent).toBe(100);
    // 全体では 15 / 40 = 37.5%
    expect(getOverallProgress(skills).percent).toBe(38);
  });

  it('週のない月は 0% にする', () => {
    const { weeks, skills } = createInitialRoadmap();

    expect(getMonthProgress('month-9', weeks, skills)).toEqual({
      checked: 0,
      total: 0,
      percent: 0,
    });
  });
});

describe('getStepProgress', () => {
  it('そのステップに属する週の項目をまとめて数える', () => {
    const { weeks, skills } = roadmapWithCheckedWeeks('week-07');

    // ステップ⑤は7週目（6項目）と8週目（2項目）
    expect(getStepProgress('step-5', weeks, skills)).toEqual({
      checked: 6,
      total: 8,
      percent: 75,
    });
  });

  it('11週目に並行するステップ⑦と⑧を別々に数える', () => {
    const { weeks, skills } = roadmapWithCheckedWeeks('week-11-git');

    expect(getStepProgress('step-7', weeks, skills).percent).toBe(100);
    expect(getStepProgress('step-8', weeks, skills).percent).toBe(0);
  });

  it('週のないステップは 0% にする', () => {
    const weeks = [buildWeek({ id: 'w1', stepId: 'step-1' })];
    const skills = [buildSkill({ weekId: 'w1', checked: true })];

    expect(getStepProgress('step-2', weeks, skills)).toEqual({ checked: 0, total: 0, percent: 0 });
  });
});
