import { describe, expect, it } from 'vitest';

import { getCurrentStreak, getLongestStreak, getStudyDates } from './streak';

const log = (date: string, minutes = 30) => ({ date, minutes });

describe('getStudyDates', () => {
  it('学習ログがある日を返す', () => {
    const dates = getStudyDates([log('2026-11-16'), log('2026-11-18')]);

    expect([...dates].sort()).toEqual(['2026-11-16', '2026-11-18']);
  });

  it('同じ日のログは1日として数える', () => {
    expect(getStudyDates([log('2026-11-16'), log('2026-11-16')]).size).toBe(1);
  });

  it('1日の合計が1分に満たない日は、学習した日に数えない', () => {
    expect(getStudyDates([log('2026-11-16', 0)]).size).toBe(0);
  });

  it('1日の合計が1分以上なら、学習した日に数える', () => {
    expect(getStudyDates([log('2026-11-16', 0.5), log('2026-11-16', 0.5)]).size).toBe(1);
  });
});

describe('getCurrentStreak', () => {
  it('ログがなければ 0', () => {
    expect(getCurrentStreak([], '2026-11-16')).toBe(0);
  });

  it('今日だけ学習していれば 1', () => {
    expect(getCurrentStreak([log('2026-11-16')], '2026-11-16')).toBe(1);
  });

  it('今日まで続いている日数を数える', () => {
    const logs = [log('2026-11-14'), log('2026-11-15'), log('2026-11-16')];

    expect(getCurrentStreak(logs, '2026-11-16')).toBe(3);
  });

  it('今日まだ学習していなければ、昨日までで数える（途切れたことにしない）', () => {
    const logs = [log('2026-11-14'), log('2026-11-15')];

    expect(getCurrentStreak(logs, '2026-11-16')).toBe(2);
  });

  it('昨日も今日も学習していなければ 0', () => {
    const logs = [log('2026-11-13'), log('2026-11-14')];

    expect(getCurrentStreak(logs, '2026-11-16')).toBe(0);
  });

  it('間が1日でも空いていたら、そこで数え終える', () => {
    const logs = [log('2026-11-12'), log('2026-11-13'), log('2026-11-15'), log('2026-11-16')];

    expect(getCurrentStreak(logs, '2026-11-16')).toBe(2);
  });

  it('月や年をまたいでも続けて数える', () => {
    const logs = [log('2026-12-30'), log('2026-12-31'), log('2027-01-01')];

    expect(getCurrentStreak(logs, '2027-01-01')).toBe(3);
  });

  it('0分のログしかない日は、学習していない日として扱う', () => {
    const logs = [log('2026-11-15'), log('2026-11-16', 0)];

    // 今日は未学習の扱いになり、昨日までの1日を数える
    expect(getCurrentStreak(logs, '2026-11-16')).toBe(1);
  });

  it('今日より先の日付のログは数えない', () => {
    expect(getCurrentStreak([log('2026-11-17')], '2026-11-16')).toBe(0);
  });

  it('ログの並び順に関係なく数える', () => {
    const logs = [log('2026-11-16'), log('2026-11-14'), log('2026-11-15')];

    expect(getCurrentStreak(logs, '2026-11-16')).toBe(3);
  });
});

describe('getLongestStreak', () => {
  it('ログがなければ 0', () => {
    expect(getLongestStreak([])).toBe(0);
  });

  it('1日だけなら 1', () => {
    expect(getLongestStreak([log('2026-11-16')])).toBe(1);
  });

  it('いちばん長く続いた日数を返す', () => {
    const logs = [
      log('2026-11-01'),
      log('2026-11-02'),
      // 11/3 は休み
      log('2026-11-04'),
      log('2026-11-05'),
      log('2026-11-06'),
      // 11/7 は休み
      log('2026-11-08'),
    ];

    expect(getLongestStreak(logs)).toBe(3);
  });

  it('いまは途切れていても、過去の最長記録を返す', () => {
    const logs = [log('2026-10-01'), log('2026-10-02'), log('2026-10-03'), log('2026-11-16')];

    expect(getLongestStreak(logs)).toBe(3);
    expect(getCurrentStreak(logs, '2026-11-16')).toBe(1);
  });

  it('同じ日のログが複数あっても1日として数える', () => {
    const logs = [log('2026-11-15'), log('2026-11-16'), log('2026-11-16')];

    expect(getLongestStreak(logs)).toBe(2);
  });

  it('ログの並び順に関係なく数える', () => {
    const logs = [log('2026-11-16'), log('2026-11-14'), log('2026-11-15')];

    expect(getLongestStreak(logs)).toBe(3);
  });
});
