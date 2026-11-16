import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';

import { buildWeekViews, findNextWeekView } from './weekView';

const SETTINGS = { startDate: '2026-11-16', breakPeriods: [] };

function viewOf(
  weekId: string,
  today: string,
  prepare?: (roadmap: ReturnType<typeof createInitialRoadmap>) => void,
) {
  const roadmap = createInitialRoadmap();
  prepare?.(roadmap);
  const views = buildWeekViews(roadmap.weeks, roadmap.skills, SETTINGS, today);
  const view = views.find(({ week }) => week.id === weekId);
  if (!view) throw new Error(`${weekId} が見つかりません`);
  return view;
}

describe('buildWeekViews', () => {
  it('すべての週を表示順に返す', () => {
    const { weeks, skills } = createInitialRoadmap();

    const views = buildWeekViews([...weeks].reverse(), skills, SETTINGS, '2026-11-16');

    expect(views.map(({ week }) => week.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('週ごとの予定期間を入れる', () => {
    expect(viewOf('week-05-06', '2026-11-16').range).toEqual({
      start: '2026-12-14',
      end: '2026-12-27',
    });
  });

  it('週ごとの進捗を入れる', () => {
    const view = viewOf('week-01', '2026-11-16', ({ skills }) => {
      skills[0]!.checked = true;
      skills[1]!.checked = true;
    });

    expect(view.progress).toEqual({ checked: 2, total: 6, percent: 33 });
  });

  it('今日が予定期間に入っている週だけ isCurrent を true にする', () => {
    expect(viewOf('week-01', '2026-11-18').isCurrent).toBe(true);
    expect(viewOf('week-02', '2026-11-18').isCurrent).toBe(false);
  });

  it('11週目は並行する2つの週がどちらも isCurrent になる', () => {
    expect(viewOf('week-11-git', '2027-01-27').isCurrent).toBe(true);
    expect(viewOf('week-11-12', '2027-01-27').isCurrent).toBe(true);
  });

  it('予定終了日を過ぎた未完成の週は「遅れ」にする', () => {
    expect(viewOf('week-01', '2026-11-23').displayStatus).toBe('late');
  });

  it('完成した週は予定終了日を過ぎても「完成」のまま', () => {
    const view = viewOf('week-01', '2026-11-23', ({ weeks }) => {
      weeks[0]!.status = 'done';
    });

    expect(view.displayStatus).toBe('done');
  });

  it('まだ始まっていない週は保存されている状態のまま', () => {
    expect(viewOf('week-08', '2026-11-18').displayStatus).toBe('not_started');
  });

  it('週がなければ空の配列を返す', () => {
    expect(buildWeekViews([], [], SETTINGS, '2026-11-16')).toEqual([]);
  });
});

describe('findNextWeekView', () => {
  function build(prepare?: (roadmap: ReturnType<typeof createInitialRoadmap>) => void) {
    const roadmap = createInitialRoadmap();
    prepare?.(roadmap);
    return buildWeekViews(roadmap.weeks, roadmap.skills, SETTINGS, '2026-11-01');
  }

  it('どの週も完成していなければ、最初の週を返す', () => {
    expect(findNextWeekView(build())?.week.id).toBe('week-01');
  });

  it('完成した週は飛ばして、表示順でいちばん手前の未完成の週を返す', () => {
    const views = build(({ weeks }) => {
      weeks[0]!.status = 'done';
      weeks[2]!.status = 'done';
    });

    expect(findNextWeekView(views)?.week.id).toBe('week-02');
  });

  it('進行中の週も未完成として扱う', () => {
    const views = build(({ weeks }) => {
      weeks[0]!.status = 'done';
      weeks[1]!.status = 'in_progress';
    });

    expect(findNextWeekView(views)?.week.id).toBe('week-02');
  });

  it('渡した順番が表示順でなくても、表示順で探す', () => {
    expect(findNextWeekView([...build()].reverse())?.week.id).toBe('week-01');
  });

  it('すべて完成していれば null を返す', () => {
    const views = build(({ weeks }) => {
      for (const week of weeks) week.status = 'done';
    });

    expect(findNextWeekView(views)).toBeNull();
  });

  it('週がなければ null を返す', () => {
    expect(findNextWeekView([])).toBeNull();
  });
});
