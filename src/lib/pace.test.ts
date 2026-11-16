import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';

import { buildSkill, buildWeek } from '../../tests/factories';
import { buildPace, getPaceChartPoints, getPaceStatus } from './pace';

// 2026-11-16 は月曜日。12週目の最終日は 2027-02-07
const SETTINGS = { startDate: '2026-11-16', breakPeriods: [] };

function pace(
  today: string,
  prepare?: (roadmap: ReturnType<typeof createInitialRoadmap>) => void,
  settings: Parameters<typeof buildPace>[2] = SETTINGS,
) {
  const roadmap = createInitialRoadmap();
  prepare?.(roadmap);
  return buildPace(roadmap.weeks, roadmap.skills, settings, today);
}

/** 指定した週の項目を、先頭から count 個チェック済みにする */
function check(
  roadmap: ReturnType<typeof createInitialRoadmap>,
  weekId: string,
  count: number,
  checkedAt: string | null,
) {
  roadmap.skills
    .filter((skill) => skill.weekId === weekId)
    .slice(0, count)
    .forEach((skill) => {
      skill.checked = true;
      skill.checkedAt = checkedAt;
    });
}

describe('buildPace：予定', () => {
  it('開始前（0週）から12週目まで、13個の点を返す', () => {
    const { points } = pace('2026-11-18');

    expect(points.map(({ week }) => week)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('各週のチェック項目を、その週に終える予定として累計する', () => {
    const { points } = pace('2026-11-18');

    // 40項目。1週目6・2〜4週目は各3・5〜6週目は7（週あたり3.5）・7週目6・8週目2・
    // 9〜10週目は4（週あたり2）・11週目はGitの3＋11〜12週目の半分1.5・12週目は残り1.5
    expect(points.map(({ planned }) => planned)).toEqual([
      0, 15, 22.5, 30, 37.5, 46.3, 55, 70, 75, 80, 85, 96.3, 100,
    ]);
  });

  it('2週にまたがる週は、項目を週数で等分する', () => {
    const weeks = [buildWeek({ id: 'w', weekStart: 1, weekEnd: 2 })];
    const skills = [1, 2, 3, 4].map((n) => buildSkill({ id: `s${n}`, weekId: 'w', order: n }));

    const { points } = buildPace(weeks, skills, SETTINGS, '2026-11-16');

    expect(points.map(({ planned }) => planned)).toEqual([0, 50, 100]);
  });

  it('チェック項目が1つもなければ、予定はすべて 0%', () => {
    const { points, actualNow } = buildPace([buildWeek({ id: 'w' })], [], SETTINGS, '2026-11-16');

    expect(points.map(({ planned }) => planned)).toEqual([0, 0]);
    expect(actualNow).toBe(0);
  });

  it('削除された週の項目は数えない', () => {
    const weeks = [buildWeek({ id: 'w' })];
    const skills = [
      buildSkill({ id: 's1', weekId: 'w' }),
      buildSkill({ id: 's2', weekId: 'deleted-week', checked: true, checkedAt: '2026-11-16' }),
    ];

    const { points, actualNow } = buildPace(weeks, skills, SETTINGS, '2026-11-16');

    expect(points.at(-1)?.planned).toBe(100);
    expect(actualNow).toBe(0);
  });
});

describe('buildPace：実績', () => {
  it('チェックした日で累計する。終わった週だけ値を持ち、進行中・これからの週は null', () => {
    // 2週目の3日目。1週目に4項目、2週目に2項目チェックした
    const { points, actualNow } = pace('2026-11-25', (roadmap) => {
      check(roadmap, 'week-01', 4, '2026-11-17');
      check(roadmap, 'week-02', 2, '2026-11-24');
    });

    expect(points.slice(0, 4).map(({ actual }) => actual)).toEqual([0, 10, null, null]);
    // 進行中の週の分は、今日の時点の進捗率に入る
    expect(actualNow).toBe(15);
  });

  it('週の最終日は、その週が終わったものとして値を持つ', () => {
    const { points } = pace('2026-11-22', (roadmap) => {
      check(roadmap, 'week-01', 2, '2026-11-22');
    });

    expect(points[1]?.actual).toBe(5);
    expect(points[2]?.actual).toBeNull();
  });

  it('予定より先の週の項目をチェックしても、チェックした日の週に数える', () => {
    const { points } = pace('2026-11-23', (roadmap) => {
      check(roadmap, 'week-07', 6, '2026-11-17');
    });

    expect(points[1]?.actual).toBe(15);
  });

  it('開始日より前にチェックした項目は、0週の点に入れる', () => {
    const { points } = pace('2026-11-23', (roadmap) => {
      check(roadmap, 'week-01', 2, '2026-11-10');
    });

    expect(points[0]?.actual).toBe(5);
    expect(points[1]?.actual).toBe(5);
  });

  it('チェックした日が入っていない項目は、今日チェックしたものとして扱う', () => {
    const { points, actualNow } = pace('2026-11-29', (roadmap) => {
      check(roadmap, 'week-01', 2, null);
    });

    // 今日は2週目の最終日。1週目の終わりには入らず、2週目の終わりに入る
    expect(points[1]?.actual).toBe(0);
    expect(points[2]?.actual).toBe(5);
    expect(actualNow).toBe(5);
  });

  it('チェックを外した項目（checked が false）は数えない', () => {
    const { actualNow } = pace('2026-11-18', (roadmap) => {
      roadmap.skills[0]!.checkedAt = '2026-11-17';
    });

    expect(actualNow).toBe(0);
  });
});

describe('buildPace：今日の位置', () => {
  it('週の途中なら、その週の中での進み具合を小数で返す', () => {
    // 1週目の3日目（7日のうち3日）
    const { todayPosition, plannedNow } = pace('2026-11-18');

    expect(todayPosition).toBeCloseTo(3 / 7);
    // 予定は 0% → 15% の 3/7 の位置
    expect(plannedNow).toBe(6.4);
  });

  it('週の最終日は、その週の終わりの位置になる', () => {
    const { todayPosition, plannedNow } = pace('2026-11-22');

    expect(todayPosition).toBe(1);
    expect(plannedNow).toBe(15);
  });

  it('開始前は null', () => {
    const { todayPosition, plannedNow, points } = pace('2026-11-10');

    expect(todayPosition).toBeNull();
    expect(plannedNow).toBeNull();
    expect(points.slice(1).every(({ actual }) => actual === null)).toBe(true);
  });

  it('週と週の間の休止中は、直前の週の終わりの位置にする', () => {
    const settings = {
      startDate: '2026-11-16',
      breakPeriods: [{ id: 'b', label: '休み', start: '2026-11-23', end: '2026-11-25' }],
    };

    const { todayPosition, plannedNow } = pace('2026-11-24', undefined, settings);

    expect(todayPosition).toBe(1);
    expect(plannedNow).toBe(15);
  });

  it('週の途中に休止期間があると、その週は長くなる', () => {
    const settings = {
      startDate: '2026-11-16',
      breakPeriods: [{ id: 'b', label: '休み', start: '2026-11-18', end: '2026-11-20' }],
    };

    // 1週目は 11/16〜11/25 の10日間。11/20 は5日目
    expect(pace('2026-11-20', undefined, settings).todayPosition).toBe(0.5);
  });
});

describe('buildPace：予定の期間を過ぎたあと', () => {
  it('終わっていなければ、今日の週まで横軸を延ばす', () => {
    // 12週目の最終日（2027-02-07）の3日後
    const { points, todayPosition, plannedNow } = pace('2027-02-10');

    expect(points).toHaveLength(14);
    // 13週目はまだ途中なので、実績の点はない
    expect(points.at(-1)).toEqual({ week: 13, planned: 100, actual: null });
    expect(points[12]).toEqual({ week: 12, planned: 100, actual: 0 });
    expect(todayPosition).toBeCloseTo(12 + 3 / 7);
    expect(plannedNow).toBe(100);
  });

  it('遅れてチェックした項目が、延ばした週に入る', () => {
    // 13週目（2027-02-08〜02-14）の最終日
    const { points } = pace('2027-02-14', (roadmap) => {
      check(roadmap, 'week-01', 6, '2027-02-09');
    });

    expect(points[12]?.actual).toBe(0);
    expect(points[13]?.actual).toBe(15);
  });

  it('すべて終わっていれば、最後にチェックした日の週で止める', () => {
    const { points, todayPosition, actualNow } = pace('2027-06-01', (roadmap) => {
      for (const skill of roadmap.skills) {
        skill.checked = true;
        skill.checkedAt = '2027-02-01';
      }
    });

    expect(points).toHaveLength(13);
    expect(points.at(-1)).toEqual({ week: 12, planned: 100, actual: 100 });
    expect(todayPosition).toBe(12);
    expect(actualNow).toBe(100);
  });

  it('何年たっても、延ばす週数には上限がある', () => {
    const { points } = pace('2036-01-01');

    // 12週＋上限の104週＋0週の点
    expect(points).toHaveLength(117);
  });
});

describe('buildPace：週がないとき', () => {
  it('点は空で、今日の位置は null', () => {
    expect(buildPace([], [], SETTINGS, '2026-11-18')).toEqual({
      points: [],
      todayPosition: null,
      plannedNow: null,
      actualNow: 0,
    });
  });
});

describe('getPaceStatus', () => {
  it('開始前（予定の進捗率がない）は「まだ始まっていない」', () => {
    expect(getPaceStatus({ plannedNow: null, actualNow: 0 })).toBe('not_started');
  });

  it('実績が予定より多ければ「進んでいる」', () => {
    expect(getPaceStatus({ plannedNow: 30, actualNow: 40 })).toBe('ahead');
  });

  it('実績が予定より少なければ「遅れている」', () => {
    expect(getPaceStatus({ plannedNow: 46.3, actualNow: 40 })).toBe('behind');
  });

  it('差が 0.5% より小さければ「予定どおり」', () => {
    expect(getPaceStatus({ plannedNow: 30, actualNow: 30 })).toBe('on_track');
    expect(getPaceStatus({ plannedNow: 30, actualNow: 30.4 })).toBe('on_track');
    expect(getPaceStatus({ plannedNow: 30, actualNow: 29.6 })).toBe('on_track');
  });

  it('差がちょうど 0.5% なら、進んでいる・遅れているとみなす', () => {
    expect(getPaceStatus({ plannedNow: 30, actualNow: 30.5 })).toBe('ahead');
    expect(getPaceStatus({ plannedNow: 30, actualNow: 29.5 })).toBe('behind');
  });
});

describe('getPaceChartPoints', () => {
  it('週の途中なら、今日の時点の点を足す（実績の線が今日で止まるようにする）', () => {
    // 2週目の3日目。1週目に6項目チェックした
    const result = pace('2026-11-25', (roadmap) => {
      check(roadmap, 'week-01', 6, '2026-11-20');
      check(roadmap, 'week-02', 2, '2026-11-24');
    });

    const chartPoints = getPaceChartPoints(result);

    expect(chartPoints).toHaveLength(14);
    // 1週目の終わりと2週目の終わりの間に入る
    expect(chartPoints.map(({ week }) => Math.floor(week)).slice(0, 4)).toEqual([0, 1, 1, 2]);
    expect(chartPoints[2]).toMatchObject({ planned: 18.2, actual: 20, isToday: true });
    // 2週目の終わりは、まだ実績がない
    expect(chartPoints[3]).toEqual({ week: 2, planned: 22.5, actual: null });
  });

  it('今日がちょうど週の終わりなら、点は足さない', () => {
    const result = pace('2026-11-22');

    expect(getPaceChartPoints(result)).toEqual(result.points);
  });

  it('開始前は、点を足さない', () => {
    const result = pace('2026-11-10');

    expect(getPaceChartPoints(result)).toEqual(result.points);
  });

  it('元の点の配列を書き換えない', () => {
    const result = pace('2026-11-25');
    const before = [...result.points];

    getPaceChartPoints(result);

    expect(result.points).toEqual(before);
  });
});
