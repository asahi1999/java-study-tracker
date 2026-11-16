import { describe, expect, it } from 'vitest';

import { buildHeatmap, getHeatLevel, getHeatmapRange, getMonthLabels } from './heatmap';

const log = (date: string, minutes: number) => ({ date, minutes });

describe('getHeatLevel', () => {
  it.each([
    [0, 0],
    [1, 1],
    [29, 1],
    [30, 2],
    [59, 2],
    [60, 3],
    [119, 3],
    [120, 4],
    [600, 4],
  ])('%i 分は段階 %i', (minutes, level) => {
    expect(getHeatLevel(minutes)).toBe(level);
  });
});

describe('getHeatmapRange', () => {
  it('学習開始日から最終週の予定終了日までにする', () => {
    expect(getHeatmapRange('2026-11-16', '2027-02-07', [], '2026-11-20')).toEqual({
      start: '2026-11-16',
      end: '2027-02-07',
    });
  });

  it('開始日より前のログがあれば、その日まで前に広げる', () => {
    const logs = [log('2026-11-10', 30), log('2026-11-12', 30)];

    expect(getHeatmapRange('2026-11-16', '2027-02-07', logs, '2026-11-20').start).toBe(
      '2026-11-10',
    );
  });

  it('予定終了日より後のログがあれば、その日まで後ろに広げる', () => {
    const logs = [log('2027-02-20', 30), log('2026-12-01', 30)];

    expect(getHeatmapRange('2026-11-16', '2027-02-07', logs, '2027-02-21').end).toBe('2027-02-20');
  });

  it('週がなく予定終了日が決まらないときは、今日までにする', () => {
    expect(getHeatmapRange('2026-11-16', null, [], '2026-11-20')).toEqual({
      start: '2026-11-16',
      end: '2026-11-20',
    });
  });

  it('終了日が開始日より前にならない（開始日がまだ来ていないとき）', () => {
    expect(getHeatmapRange('2026-11-16', null, [], '2026-11-10')).toEqual({
      start: '2026-11-16',
      end: '2026-11-16',
    });
  });
});

describe('buildHeatmap', () => {
  it('月曜始まりの週ごとに7マスずつ返し、期間の外の日は null にする', () => {
    // 11/18（水）〜11/24（火）
    const weeks = buildHeatmap({ start: '2026-11-18', end: '2026-11-24' }, []);

    expect(weeks.map(({ weekStart }) => weekStart)).toEqual(['2026-11-16', '2026-11-23']);
    expect(weeks[0]?.days.map((day) => day?.date ?? null)).toEqual([
      null,
      null,
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(weeks[1]?.days.map((day) => day?.date ?? null)).toEqual([
      '2026-11-23',
      '2026-11-24',
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('日ごとの学習時間の合計と、色の段階を入れる', () => {
    const logs = [log('2026-11-16', 20), log('2026-11-16', 25), log('2026-11-17', 130)];

    const [week] = buildHeatmap({ start: '2026-11-16', end: '2026-11-22' }, logs);

    expect(week?.days[0]).toEqual({ date: '2026-11-16', minutes: 45, level: 2 });
    expect(week?.days[1]).toEqual({ date: '2026-11-17', minutes: 130, level: 4 });
    expect(week?.days[2]).toEqual({ date: '2026-11-18', minutes: 0, level: 0 });
  });

  it('12週間なら12列になる', () => {
    expect(buildHeatmap({ start: '2026-11-16', end: '2027-02-07' }, [])).toHaveLength(12);
  });

  it('1日だけの期間でも1列を返す', () => {
    const weeks = buildHeatmap({ start: '2026-11-22', end: '2026-11-22' }, []);

    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.days.filter(Boolean)).toHaveLength(1);
  });
});

describe('getMonthLabels', () => {
  const labelsOf = (start: string, end: string) => getMonthLabels(buildHeatmap({ start, end }, []));

  it('先頭の列と、月が変わった列にだけ月の名前を出す', () => {
    // 11/16（月）から4週間。12月に入るのは 11/30 の週ではなく、月曜が12月になる 12/7 の週
    expect(labelsOf('2026-11-16', '2026-12-13')).toEqual(['11月', '', '', '12月']);
  });

  it('年をまたいでも、月が変わった列に出す', () => {
    const labels = labelsOf('2026-12-21', '2027-01-10');

    expect(labels).toEqual(['12月', '', '1月']);
  });

  it('先頭の列のすぐ隣で月が変わるときは、先頭の列には出さない（文字が重なるため）', () => {
    // 11/30（月）・12/7・12/14 の3週間。11/30 の週の次が 12/7 の週
    expect(labelsOf('2026-11-30', '2026-12-20')).toEqual(['', '12月', '']);
  });

  it('期間が週の途中から始まるときは、その週の最初の日の月を使う', () => {
    // 12/1（火）から始まる。月曜（11/30）は期間の外
    expect(labelsOf('2026-12-01', '2026-12-13')).toEqual(['12月', '']);
  });

  it('1列だけなら、その列に出す', () => {
    expect(labelsOf('2026-11-16', '2026-11-18')).toEqual(['11月']);
  });

  it('列がなければ空', () => {
    expect(getMonthLabels([])).toEqual([]);
  });
});
