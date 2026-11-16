import { describe, expect, it } from 'vitest';

import {
  countPeriodDays,
  getMinutesByDate,
  getMinutesByStep,
  getMinutesInCalendarWeek,
  getMinutesOnDate,
  getStudyAverages,
  getWeeklyMinutes,
  sumMinutes,
} from './stats';

const log = (date: string, minutes: number) => ({ date, minutes });

describe('sumMinutes', () => {
  it('学習時間を合計する', () => {
    expect(sumMinutes([{ minutes: 30 }, { minutes: 45 }])).toBe(75);
  });

  it('ログがなければ 0', () => {
    expect(sumMinutes([])).toBe(0);
  });
});

describe('getMinutesOnDate', () => {
  it('指定した日のログだけを合計する', () => {
    const logs = [log('2026-11-15', 20), log('2026-11-16', 30), log('2026-11-16', 45)];

    expect(getMinutesOnDate(logs, '2026-11-16')).toBe(75);
  });

  it('その日のログがなければ 0', () => {
    expect(getMinutesOnDate([log('2026-11-15', 20)], '2026-11-16')).toBe(0);
  });
});

describe('getMinutesInCalendarWeek', () => {
  // 2026-11-16 は月曜日、2026-11-22 は日曜日
  const logs = [
    log('2026-11-15', 100), // 前の週の日曜日
    log('2026-11-16', 30), // 月曜日
    log('2026-11-19', 40),
    log('2026-11-22', 50), // 日曜日
    log('2026-11-23', 200), // 次の週の月曜日
  ];

  it('月曜日から日曜日までを合計する', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-11-18')).toBe(120);
  });

  it('月曜日に見ても、同じ週を合計する', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-11-16')).toBe(120);
  });

  it('日曜日に見ても、同じ週を合計する（日曜始まりにしない）', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-11-22')).toBe(120);
  });

  it('その週のログがなければ 0', () => {
    expect(getMinutesInCalendarWeek(logs, '2026-12-01')).toBe(0);
  });
});

describe('getMinutesByDate', () => {
  it('同じ日のログを合計する', () => {
    const result = getMinutesByDate([
      log('2026-11-16', 30),
      log('2026-11-16', 45),
      log('2026-11-17', 20),
    ]);

    expect([...result]).toEqual([
      ['2026-11-16', 75],
      ['2026-11-17', 20],
    ]);
  });
});

describe('countPeriodDays', () => {
  it('開始日と今日の両方を含めて数える', () => {
    expect(countPeriodDays('2026-11-16', '2026-11-16', [])).toBe(1);
    expect(countPeriodDays('2026-11-16', '2026-11-22', [])).toBe(7);
  });

  it('開始日がまだ来ていなければ 0', () => {
    expect(countPeriodDays('2026-11-16', '2026-11-15', [])).toBe(0);
  });

  it('休止日は数えない', () => {
    const breaks = [{ id: 'b', label: '休み', start: '2026-11-18', end: '2026-11-19' }];

    expect(countPeriodDays('2026-11-16', '2026-11-22', breaks)).toBe(5);
  });

  it('今日より先まで続く休止期間は、今日までの分だけ引く', () => {
    const breaks = [{ id: 'b', label: '休み', start: '2026-11-21', end: '2026-11-30' }];

    // 11/16〜11/22 の7日のうち、11/21・11/22 の2日が休止
    expect(countPeriodDays('2026-11-16', '2026-11-22', breaks)).toBe(5);
  });

  it('開始日より前から続く休止期間は、開始日からの分だけ引く', () => {
    const breaks = [{ id: 'b', label: '休み', start: '2026-11-10', end: '2026-11-17' }];

    expect(countPeriodDays('2026-11-16', '2026-11-22', breaks)).toBe(5);
  });

  it('期間の外にある休止期間は引かない', () => {
    const breaks = [{ id: 'b', label: '年末年始', start: '2026-12-29', end: '2027-01-03' }];

    expect(countPeriodDays('2026-11-16', '2026-11-22', breaks)).toBe(7);
  });

  it('重なっている休止期間を二重に引かない', () => {
    const breaks = [
      { id: 'a', label: '休み1', start: '2026-11-18', end: '2026-11-19' },
      { id: 'b', label: '休み2', start: '2026-11-19', end: '2026-11-20' },
    ];

    expect(countPeriodDays('2026-11-16', '2026-11-22', breaks)).toBe(4);
  });
});

describe('getStudyAverages', () => {
  const settings = { startDate: '2026-11-16', breakPeriods: [] };

  it('累計と、1日あたり・学習した日あたりの平均を計算する', () => {
    // 開始から10日間（11/16〜11/25）のうち、4日学習して合計300分
    const logs = [
      log('2026-11-16', 60),
      log('2026-11-16', 30),
      log('2026-11-18', 90),
      log('2026-11-20', 45),
      log('2026-11-25', 75),
    ];

    expect(getStudyAverages(logs, settings, '2026-11-25')).toEqual({
      totalMinutes: 300,
      perDayMinutes: 30,
      perStudyDayMinutes: 75,
      periodDays: 10,
      studyDays: 4,
    });
  });

  it('平均は分単位に四捨五入する', () => {
    // 100分 ÷ 3日 = 33.33…分
    const result = getStudyAverages([log('2026-11-16', 100)], settings, '2026-11-18');

    expect(result.perDayMinutes).toBe(33);
  });

  it('1日あたりの平均の分母から、休止日を除く', () => {
    const withBreak = {
      startDate: '2026-11-16',
      breakPeriods: [{ id: 'b', label: '休み', start: '2026-11-17', end: '2026-11-21' }],
    };

    // 11/16〜11/25 の10日のうち5日が休止 → 300分 ÷ 5日
    const result = getStudyAverages([log('2026-11-16', 300)], withBreak, '2026-11-25');

    expect(result.periodDays).toBe(5);
    expect(result.perDayMinutes).toBe(60);
  });

  it('ログがなければ、すべて 0', () => {
    expect(getStudyAverages([], settings, '2026-11-25')).toEqual({
      totalMinutes: 0,
      perDayMinutes: 0,
      perStudyDayMinutes: 0,
      periodDays: 10,
      studyDays: 0,
    });
  });

  it('開始日がまだ来ていなければ、1日あたりの平均は 0（0で割らない）', () => {
    const result = getStudyAverages([log('2026-11-10', 60)], settings, '2026-11-12');

    expect(result).toMatchObject({ totalMinutes: 60, perDayMinutes: 0, perStudyDayMinutes: 60 });
  });
});

describe('getWeeklyMinutes', () => {
  it('学習開始日の週から今日の週までを、ログがない週も含めて返す', () => {
    // 11/16・11/23・11/30 は月曜日
    const logs = [log('2026-11-16', 30), log('2026-11-22', 60), log('2026-12-02', 45)];

    expect(getWeeklyMinutes(logs, '2026-11-16', '2026-12-03')).toEqual([
      { weekStart: '2026-11-16', minutes: 90 },
      { weekStart: '2026-11-23', minutes: 0 },
      { weekStart: '2026-11-30', minutes: 45 },
    ]);
  });

  it('開始日が週の途中でも、その週の月曜日から始める', () => {
    const result = getWeeklyMinutes([], '2026-11-18', '2026-11-18');

    expect(result).toEqual([{ weekStart: '2026-11-16', minutes: 0 }]);
  });

  it('開始日より前のログがあれば、その週まで広げる', () => {
    const result = getWeeklyMinutes([log('2026-11-10', 40)], '2026-11-16', '2026-11-18');

    expect(result).toEqual([
      { weekStart: '2026-11-09', minutes: 40 },
      { weekStart: '2026-11-16', minutes: 0 },
    ]);
  });

  it('開始日がまだ来ていなければ、今日の週から始める', () => {
    const result = getWeeklyMinutes([], '2026-11-16', '2026-11-03');

    expect(result.map(({ weekStart }) => weekStart)).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
    ]);
  });
});

describe('getMinutesByStep', () => {
  const steps = [
    { id: 'step-2', order: 2 },
    { id: 'step-1', order: 1 },
    { id: 'step-3', order: 3 },
  ];
  const weeks = [
    { id: 'w1', stepId: 'step-1' },
    { id: 'w2', stepId: 'step-1' },
    { id: 'w3', stepId: 'step-2' },
  ];
  const stepLog = (weekId: string | null, minutes: number) => ({ weekId, minutes });

  it('ステップの表示順に、学習時間と割合を返す（0分のステップも含める）', () => {
    const logs = [stepLog('w1', 60), stepLog('w2', 30), stepLog('w3', 30)];

    expect(getMinutesByStep(logs, weeks, steps)).toEqual([
      { stepId: 'step-1', minutes: 90, percent: 75 },
      { stepId: 'step-2', minutes: 30, percent: 25 },
      { stepId: 'step-3', minutes: 0, percent: 0 },
    ]);
  });

  it('週が付いていないログと、削除された週のログは「週の指定なし」にまとめて最後に足す', () => {
    const logs = [stepLog('w1', 50), stepLog(null, 30), stepLog('deleted-week', 20)];

    const result = getMinutesByStep(logs, weeks, steps);

    expect(result.at(-1)).toEqual({ stepId: null, minutes: 50, percent: 50 });
    expect(result).toHaveLength(4);
  });

  it('「週の指定なし」のログがなければ、その行は足さない', () => {
    const result = getMinutesByStep([stepLog('w1', 50)], weeks, steps);

    expect(result.map(({ stepId }) => stepId)).toEqual(['step-1', 'step-2', 'step-3']);
  });

  it('ログがなければ、すべて 0分・0%', () => {
    expect(getMinutesByStep([], weeks, steps)).toEqual([
      { stepId: 'step-1', minutes: 0, percent: 0 },
      { stepId: 'step-2', minutes: 0, percent: 0 },
      { stepId: 'step-3', minutes: 0, percent: 0 },
    ]);
  });
});
