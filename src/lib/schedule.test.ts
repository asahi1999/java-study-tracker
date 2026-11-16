import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';
import type { BreakPeriod } from '@/types';

import { buildWeek } from '../../tests/factories';
import {
  buildSchedule,
  findCurrentWeeks,
  getDisplayStatus,
  getPlannedRange,
  getScheduleEndDate,
  isBreakDay,
  isDateInRange,
  isWeekLate,
  normalizeBreakPeriods,
  studyDayToDate,
} from './schedule';

// 2026-11-16 は月曜日。テストの日付はこの開始日を基準にしている
const START = '2026-11-16';

function breakPeriod(start: string, end: string, id = `${start}_${end}`): BreakPeriod {
  return { id, label: '休止', start, end };
}

const YEAR_END = breakPeriod('2026-12-29', '2027-01-03');

function settings(...breakPeriods: BreakPeriod[]) {
  return { startDate: START, breakPeriods };
}

describe('normalizeBreakPeriods', () => {
  it('休止期間がなければ空の配列を返す', () => {
    expect(normalizeBreakPeriods([])).toEqual([]);
  });

  it('開始日の順に並べる', () => {
    const result = normalizeBreakPeriods([
      breakPeriod('2027-01-10', '2027-01-11'),
      breakPeriod('2026-12-01', '2026-12-02'),
    ]);

    expect(result).toEqual([
      { start: '2026-12-01', end: '2026-12-02' },
      { start: '2027-01-10', end: '2027-01-11' },
    ]);
  });

  it('重なっている期間は1つにまとめる', () => {
    const result = normalizeBreakPeriods([
      breakPeriod('2026-12-29', '2027-01-01'),
      breakPeriod('2026-12-31', '2027-01-03'),
    ]);

    expect(result).toEqual([{ start: '2026-12-29', end: '2027-01-03' }]);
  });

  it('隣り合っている期間は1つにまとめる', () => {
    const result = normalizeBreakPeriods([
      breakPeriod('2026-12-29', '2026-12-31'),
      breakPeriod('2027-01-01', '2027-01-03'),
    ]);

    expect(result).toEqual([{ start: '2026-12-29', end: '2027-01-03' }]);
  });

  it('1日でも間が空いていれば別の期間として残す', () => {
    const result = normalizeBreakPeriods([
      breakPeriod('2026-12-29', '2026-12-30'),
      breakPeriod('2027-01-01', '2027-01-03'),
    ]);

    expect(result).toHaveLength(2);
  });

  it('別の期間にすっぽり含まれる期間は吸収する', () => {
    const result = normalizeBreakPeriods([
      breakPeriod('2026-12-20', '2027-01-10'),
      breakPeriod('2026-12-29', '2027-01-03'),
    ]);

    expect(result).toEqual([{ start: '2026-12-20', end: '2027-01-10' }]);
  });

  it('1日だけの期間も有効にする', () => {
    expect(normalizeBreakPeriods([breakPeriod('2026-11-23', '2026-11-23')])).toEqual([
      { start: '2026-11-23', end: '2026-11-23' },
    ]);
  });

  it('終了日が開始日より前の期間や、日付として正しくない期間は無視する', () => {
    const result = normalizeBreakPeriods([
      breakPeriod('2027-01-03', '2026-12-29'),
      breakPeriod('2026-02-30', '2026-03-02'),
      breakPeriod('', ''),
    ]);

    expect(result).toEqual([]);
  });

  it('渡した配列や期間を書き換えない', () => {
    const periods = [
      breakPeriod('2026-12-29', '2026-12-31'),
      breakPeriod('2027-01-01', '2027-01-03'),
    ];

    normalizeBreakPeriods(periods);

    expect(periods[0]).toMatchObject({ start: '2026-12-29', end: '2026-12-31' });
  });
});

describe('isBreakDay', () => {
  it('休止期間の最初の日と最後の日を含む', () => {
    expect(isBreakDay('2026-12-29', [YEAR_END])).toBe(true);
    expect(isBreakDay('2027-01-03', [YEAR_END])).toBe(true);
  });

  it('前日と翌日は休止日ではない', () => {
    expect(isBreakDay('2026-12-28', [YEAR_END])).toBe(false);
    expect(isBreakDay('2027-01-04', [YEAR_END])).toBe(false);
  });

  it('休止期間がなければ常に false', () => {
    expect(isBreakDay('2026-12-31', [])).toBe(false);
  });
});

describe('studyDayToDate', () => {
  it('休止期間がなければ、開始日に日数を足した日になる', () => {
    expect(studyDayToDate(START, 0, [])).toBe('2026-11-16');
    expect(studyDayToDate(START, 6, [])).toBe('2026-11-22');
    expect(studyDayToDate(START, 83, [])).toBe('2027-02-07');
  });

  it('休止日は数えずに飛ばす', () => {
    const breaks = [breakPeriod('2026-11-18', '2026-11-19')];

    expect(studyDayToDate(START, 0, breaks)).toBe('2026-11-16');
    expect(studyDayToDate(START, 1, breaks)).toBe('2026-11-17');
    // 18日・19日は休止なので、3日目の学習日は20日になる
    expect(studyDayToDate(START, 2, breaks)).toBe('2026-11-20');
    expect(studyDayToDate(START, 3, breaks)).toBe('2026-11-21');
  });

  it('目的の日より後にある休止期間は影響しない', () => {
    expect(studyDayToDate(START, 6, [YEAR_END])).toBe('2026-11-22');
  });

  it('開始日より前に終わる休止期間は影響しない', () => {
    const breaks = [breakPeriod('2026-11-01', '2026-11-15')];

    expect(studyDayToDate(START, 0, breaks)).toBe('2026-11-16');
  });

  it('開始日が休止期間の中にあれば、休止が明けた日から数える', () => {
    const breaks = [breakPeriod('2026-11-14', '2026-11-17')];

    expect(studyDayToDate(START, 0, breaks)).toBe('2026-11-18');
    expect(studyDayToDate(START, 6, breaks)).toBe('2026-11-24');
  });

  it('開始日が休止期間の最終日でも、翌日から数える', () => {
    const breaks = [breakPeriod('2026-11-10', '2026-11-16')];

    expect(studyDayToDate(START, 0, breaks)).toBe('2026-11-17');
  });

  it('複数の休止期間をすべて飛ばす', () => {
    const breaks = [breakPeriod('2026-11-18', '2026-11-18'), YEAR_END];

    // 1日 + 6日 = 7日ぶん後ろへずれる
    expect(studyDayToDate(START, 83, breaks)).toBe('2027-02-14');
  });

  it('休止が明けた直後にまた休止がある場合も飛ばす', () => {
    const breaks = [
      breakPeriod('2026-11-17', '2026-11-18'),
      breakPeriod('2026-11-20', '2026-11-21'),
    ];

    expect(studyDayToDate(START, 1, breaks)).toBe('2026-11-19');
    expect(studyDayToDate(START, 2, breaks)).toBe('2026-11-22');
  });

  it('何年も続く休止期間でも正しく計算できる', () => {
    const breaks = [breakPeriod('2026-11-17', '2036-11-16')];

    expect(studyDayToDate(START, 1, breaks)).toBe('2036-11-17');
  });

  it('マイナスの番号は0番目として扱う', () => {
    expect(studyDayToDate(START, -5, [])).toBe('2026-11-16');
  });
});

describe('getPlannedRange', () => {
  describe('休止期間がない場合', () => {
    it('1週目は開始日から7日間', () => {
      expect(getPlannedRange({ weekStart: 1, weekEnd: 1 }, settings())).toEqual({
        start: '2026-11-16',
        end: '2026-11-22',
      });
    });

    it('N週目は「開始日 + (N−1)×7日」から始まる', () => {
      expect(getPlannedRange({ weekStart: 2, weekEnd: 2 }, settings())).toEqual({
        start: '2026-11-23',
        end: '2026-11-29',
      });
    });

    it('2週分の週は14日間になる', () => {
      expect(getPlannedRange({ weekStart: 5, weekEnd: 6 }, settings())).toEqual({
        start: '2026-12-14',
        end: '2026-12-27',
      });
    });

    it('最後の週（11〜12週目）は開始日の84日目で終わる', () => {
      expect(getPlannedRange({ weekStart: 11, weekEnd: 12 }, settings())).toEqual({
        start: '2027-01-25',
        end: '2027-02-07',
      });
    });
  });

  describe('年末年始（12/29〜1/3 の6日間）を休止期間にした場合', () => {
    it('休止より前に終わる週は変わらない', () => {
      expect(getPlannedRange({ weekStart: 5, weekEnd: 6 }, settings(YEAR_END))).toEqual({
        start: '2026-12-14',
        end: '2026-12-27',
      });
    });

    it('休止をまたぐ週は、開始日はそのままで終了日が6日延びる', () => {
      expect(getPlannedRange({ weekStart: 7, weekEnd: 7 }, settings(YEAR_END))).toEqual({
        start: '2026-12-28',
        end: '2027-01-09',
      });
    });

    it('休止より後の週は、開始日も終了日も6日後ろへずれる', () => {
      expect(getPlannedRange({ weekStart: 8, weekEnd: 8 }, settings(YEAR_END))).toEqual({
        start: '2027-01-10',
        end: '2027-01-16',
      });
      expect(getPlannedRange({ weekStart: 11, weekEnd: 12 }, settings(YEAR_END))).toEqual({
        start: '2027-01-31',
        end: '2027-02-13',
      });
    });
  });

  describe('休止期間と週の境目', () => {
    it('週の最終日が休止なら、終了日が翌日に延びる', () => {
      const oneDay = breakPeriod('2026-11-22', '2026-11-22');

      expect(getPlannedRange({ weekStart: 1, weekEnd: 1 }, settings(oneDay))).toEqual({
        start: '2026-11-16',
        end: '2026-11-23',
      });
      expect(getPlannedRange({ weekStart: 2, weekEnd: 2 }, settings(oneDay)).start).toBe(
        '2026-11-24',
      );
    });

    it('週の初日から休止なら、その週は休止が明けた日から始まる', () => {
      const wholeWeek = breakPeriod('2026-11-23', '2026-11-29');

      // 1週目は休止の前日に終わるので変わらない
      expect(getPlannedRange({ weekStart: 1, weekEnd: 1 }, settings(wholeWeek))).toEqual({
        start: '2026-11-16',
        end: '2026-11-22',
      });
      expect(getPlannedRange({ weekStart: 2, weekEnd: 2 }, settings(wholeWeek))).toEqual({
        start: '2026-11-30',
        end: '2026-12-06',
      });
    });

    it('学習開始日が休止期間の中なら、1週目は休止が明けた日から始まる', () => {
      const atStart = breakPeriod('2026-11-14', '2026-11-17');

      expect(getPlannedRange({ weekStart: 1, weekEnd: 1 }, settings(atStart))).toEqual({
        start: '2026-11-18',
        end: '2026-11-24',
      });
    });

    it('学習開始日より前の休止期間は無視する', () => {
      const before = breakPeriod('2026-11-01', '2026-11-10');

      expect(getPlannedRange({ weekStart: 1, weekEnd: 1 }, settings(before))).toEqual({
        start: '2026-11-16',
        end: '2026-11-22',
      });
    });

    it('最後の週より後の休止期間は無視する', () => {
      const after = breakPeriod('2027-03-01', '2027-03-10');

      expect(getPlannedRange({ weekStart: 11, weekEnd: 12 }, settings(after)).end).toBe(
        '2027-02-07',
      );
    });
  });

  it('終わりが始まりより前の不正な週は、1週ぶんとして扱う', () => {
    expect(getPlannedRange({ weekStart: 3, weekEnd: 1 }, settings())).toEqual({
      start: '2026-11-30',
      end: '2026-12-06',
    });
  });
});

describe('buildSchedule', () => {
  it('すべての週の予定期間を、週のIDから引けるようにする', () => {
    const { weeks } = createInitialRoadmap();

    const schedule = buildSchedule(weeks, settings());

    expect(schedule.size).toBe(10);
    expect(schedule.get('week-01')).toEqual({ start: '2026-11-16', end: '2026-11-22' });
    expect(schedule.get('week-09-10')).toEqual({ start: '2027-01-11', end: '2027-01-24' });
  });

  it('11週目に並行する2つの週は、同じ日に始まり別の日に終わる', () => {
    const { weeks } = createInitialRoadmap();

    const schedule = buildSchedule(weeks, settings());

    expect(schedule.get('week-11-git')).toEqual({ start: '2027-01-25', end: '2027-01-31' });
    expect(schedule.get('week-11-12')).toEqual({ start: '2027-01-25', end: '2027-02-07' });
  });

  it('週がなければ空になる', () => {
    expect(buildSchedule([], settings()).size).toBe(0);
  });
});

describe('isDateInRange', () => {
  const range = { start: '2026-11-16', end: '2026-11-22' };

  it('開始日と終了日を含む', () => {
    expect(isDateInRange('2026-11-16', range)).toBe(true);
    expect(isDateInRange('2026-11-22', range)).toBe(true);
  });

  it('前日と翌日は含まない', () => {
    expect(isDateInRange('2026-11-15', range)).toBe(false);
    expect(isDateInRange('2026-11-23', range)).toBe(false);
  });
});

describe('findCurrentWeeks', () => {
  const { weeks } = createInitialRoadmap();
  const schedule = buildSchedule(weeks, settings());

  function currentIds(today: string, target = schedule): string[] {
    return findCurrentWeeks(weeks, target, today).map((week) => week.id);
  }

  it('学習開始日は1週目', () => {
    expect(currentIds('2026-11-16')).toEqual(['week-01']);
  });

  it('週の最終日まではその週で、翌日から次の週になる', () => {
    expect(currentIds('2026-11-22')).toEqual(['week-01']);
    expect(currentIds('2026-11-23')).toEqual(['week-02']);
  });

  it('2週分の週は14日間ずっと現在の週になる', () => {
    expect(currentIds('2026-12-14')).toEqual(['week-05-06']);
    expect(currentIds('2026-12-27')).toEqual(['week-05-06']);
  });

  it('11週目は並行する2つの週を表示順に返す', () => {
    expect(currentIds('2027-01-27')).toEqual(['week-11-git', 'week-11-12']);
  });

  it('12週目は⑧の週だけになる', () => {
    expect(currentIds('2027-02-01')).toEqual(['week-11-12']);
  });

  it('学習開始日より前は0件', () => {
    expect(currentIds('2026-11-15')).toEqual([]);
  });

  it('最後の週が終わった後は0件', () => {
    expect(currentIds('2027-02-08')).toEqual([]);
  });

  it('週と週の間にある休止期間の間は0件', () => {
    const withBreak = buildSchedule(weeks, settings(breakPeriod('2026-11-23', '2026-11-29')));

    expect(currentIds('2026-11-25', withBreak)).toEqual([]);
    expect(currentIds('2026-11-30', withBreak)).toEqual(['week-02']);
  });

  it('週の途中にある休止期間の間は、その週を現在の週として返す', () => {
    const withBreak = buildSchedule(weeks, settings(YEAR_END));

    // 7週目は 12/28〜1/9 に延びていて、休止中の日もその期間に入っている
    expect(currentIds('2026-12-31', withBreak)).toEqual(['week-07']);
  });

  it('渡した週の順番に関係なく、表示順に並べる', () => {
    const reversed = [...weeks].reverse();

    const result = findCurrentWeeks(reversed, schedule, '2027-01-27');

    expect(result.map((week) => week.id)).toEqual(['week-11-git', 'week-11-12']);
  });

  it('予定期間が分からない週は対象にしない', () => {
    const unknown = buildWeek({ id: 'unknown' });

    expect(findCurrentWeeks([unknown], schedule, '2026-11-16')).toEqual([]);
  });
});

describe('isWeekLate', () => {
  const range = { start: '2026-11-16', end: '2026-11-22' };

  it('予定終了日の当日は、まだ遅れではない', () => {
    expect(isWeekLate({ status: 'in_progress' }, range, '2026-11-22')).toBe(false);
  });

  it('予定終了日を1日でも過ぎて完成していなければ遅れ', () => {
    expect(isWeekLate({ status: 'in_progress' }, range, '2026-11-23')).toBe(true);
    expect(isWeekLate({ status: 'not_started' }, range, '2026-11-23')).toBe(true);
  });

  it('完成していれば、予定終了日を過ぎていても遅れではない', () => {
    expect(isWeekLate({ status: 'done' }, range, '2027-03-01')).toBe(false);
  });

  it('予定期間の前や途中は遅れではない', () => {
    expect(isWeekLate({ status: 'not_started' }, range, '2026-11-10')).toBe(false);
    expect(isWeekLate({ status: 'not_started' }, range, '2026-11-18')).toBe(false);
  });

  it('休止期間で予定が延びた週は、延びた終了日で判定する', () => {
    const week7 = getPlannedRange({ weekStart: 7, weekEnd: 7 }, settings(YEAR_END));

    // 休止がなければ 1/3 に終わる週。休止を登録すると 1/9 まで延びる
    expect(isWeekLate({ status: 'in_progress' }, week7, '2027-01-05')).toBe(false);
    expect(isWeekLate({ status: 'in_progress' }, week7, '2027-01-10')).toBe(true);
  });
});

describe('getDisplayStatus', () => {
  const range = { start: '2026-11-16', end: '2026-11-22' };

  it('遅れていなければ保存されている状態をそのまま返す', () => {
    expect(getDisplayStatus({ status: 'not_started' }, range, '2026-11-18')).toBe('not_started');
    expect(getDisplayStatus({ status: 'in_progress' }, range, '2026-11-18')).toBe('in_progress');
    expect(getDisplayStatus({ status: 'done' }, range, '2026-11-18')).toBe('done');
  });

  it('未着手・進行中の週が予定終了日を過ぎたら「遅れ」にする', () => {
    expect(getDisplayStatus({ status: 'not_started' }, range, '2026-11-23')).toBe('late');
    expect(getDisplayStatus({ status: 'in_progress' }, range, '2026-11-23')).toBe('late');
  });

  it('完成した週は予定終了日を過ぎても「完成」のまま', () => {
    expect(getDisplayStatus({ status: 'done' }, range, '2026-11-23')).toBe('done');
  });
});

describe('getScheduleEndDate', () => {
  it('いちばん遅い予定終了日を返す', () => {
    const { weeks } = createInitialRoadmap();
    const schedule = buildSchedule(weeks, { startDate: START, breakPeriods: [] });

    // 12週目の最終日（開始日 + 12×7日 − 1日）
    expect(getScheduleEndDate([...schedule.values()])).toBe('2027-02-07');
  });

  it('並び順が終了日の順でなくても、いちばん遅い日を返す', () => {
    expect(
      getScheduleEndDate([
        { start: '2026-11-30', end: '2026-12-06' },
        { start: '2026-11-16', end: '2026-11-22' },
      ]),
    ).toBe('2026-12-06');
  });

  it('休止期間があると、その分だけ後ろにずれる', () => {
    const { weeks } = createInitialRoadmap();
    const breakPeriods: BreakPeriod[] = [
      { id: 'b1', label: '年末年始', start: '2026-12-29', end: '2027-01-03' },
    ];
    const schedule = buildSchedule(weeks, { startDate: START, breakPeriods });

    expect(getScheduleEndDate([...schedule.values()])).toBe('2027-02-13');
  });

  it('週が1つもなければ null を返す', () => {
    expect(getScheduleEndDate([])).toBeNull();
  });
});
