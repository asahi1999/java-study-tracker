import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { formatDateWithWeekday, formatMinutes } from '@/lib/format';
import { getMonthLabels, type HeatCell, type HeatLevel, type HeatWeek } from '@/lib/heatmap';

// クラス名は Tailwind が見つけられるよう、組み立てずにそのまま書く
const LEVEL_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
};
const LEVELS: readonly HeatLevel[] = [0, 1, 2, 3, 4];

// 行は月曜〜日曜。すべての曜日を書くと詰まるので、1つおきに出す
const WEEKDAY_LABELS = ['月', '', '水', '', '金', '', '日'];

const CELL = 'size-[18px] rounded-[4px]';

function cellText(cell: HeatCell): string {
  return `${formatDateWithWeekday(cell.date)}：${formatMinutes(cell.minutes)}`;
}

type StudyCalendarProps = {
  weeks: readonly HeatWeek[];
  today: string;
};

/** 学習カレンダー（GitHub の草のような表）。1マスが1日で、学習時間が長いほど色が濃い */
export function StudyCalendar({ weeks, today }: StudyCalendarProps) {
  // カーソルを合わせた（スマホでは押した）マス
  const [active, setActive] = useState<HeatCell | null>(null);

  const cells = weeks.flatMap((week) => week.days).filter((day): day is HeatCell => day !== null);
  const studyDays = cells.filter((cell) => cell.minutes >= 1).length;
  const first = cells[0];
  const last = cells.at(-1);
  const labels = getMonthLabels(weeks);

  return (
    <Card title="学習カレンダー">
      {/* 期間が長いと横に伸びるので、はみ出した分は横スクロールで見られるようにする */}
      <div className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={
            first && last
              ? `${formatDateWithWeekday(first.date)}から${formatDateWithWeekday(last.date)}までの学習カレンダー。学習した日は${studyDays}日`
              : '学習カレンダー'
          }
          className="inline-grid grid-flow-col grid-rows-[auto_repeat(7,auto)] gap-[3px]"
          onMouseLeave={() => setActive(null)}
        >
          <span />
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={index} className="pr-1.5 text-[11px] leading-[18px] text-muted">
              {label}
            </span>
          ))}

          {weeks.map((week, weekIndex) => (
            <div key={week.weekStart} className="contents">
              {/* 月の名前はマスより幅が広いので、列の幅を広げないよう重ねて置く */}
              <span className="relative h-4">
                <span className="absolute left-0 top-0 whitespace-nowrap text-[11px] leading-4 text-muted">
                  {labels[weekIndex]}
                </span>
              </span>
              {week.days.map((cell, dayIndex) => {
                if (!cell) return <span key={dayIndex} className={CELL} />;

                const isFuture = cell.date > today;
                return (
                  <span
                    key={cell.date}
                    title={isFuture ? formatDateWithWeekday(cell.date) : cellText(cell)}
                    onMouseEnter={() => setActive(cell)}
                    onClick={() => setActive(cell)}
                    className={[
                      CELL,
                      // これからの日は、まだ記録がないことが分かるよう輪郭だけにする
                      isFuture && cell.minutes === 0
                        ? 'border border-line'
                        : LEVEL_CLASSES[cell.level],
                      cell.date === today
                        ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface'
                        : '',
                    ].join(' ')}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2 min-h-5 text-[13px] leading-5">
        {active ? (
          <span className="font-bold">{cellText(active)}</span>
        ) : (
          <span className="text-muted">
            マスに合わせる（スマホでは押す）と、その日の学習時間が出ます。
          </span>
        )}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          少ない
          {LEVELS.map((level) => (
            <span
              key={level}
              aria-hidden
              className={`size-3 rounded-[3px] ${LEVEL_CLASSES[level]}`}
            />
          ))}
          多い
        </span>
        <span>0分／1〜29分／30〜59分／60〜119分／120分以上</span>
      </div>
    </Card>
  );
}
