import { type KeyboardEvent, useId, useRef, useState } from 'react';

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

// 矢印キーで動く日数。マスは縦に1週間（月〜日）、横に週が並ぶので、上下は1日、左右は1週
const KEY_STEPS: Record<string, number> = {
  ArrowUp: -1,
  ArrowDown: 1,
  ArrowLeft: -7,
  ArrowRight: 7,
};

/** マスの名前（読み上げと、下の欄に出す文字）。これからの日で記録がなければ、日付だけにする */
function cellLabel(cell: HeatCell, today: string): string {
  if (cell.date > today && cell.minutes === 0) return formatDateWithWeekday(cell.date);
  return `${formatDateWithWeekday(cell.date)}：${formatMinutes(cell.minutes)}`;
}

/** Tab で最初に入るマス。今日のマス、なければ今日より前でいちばん近い日、それもなければ最初の日 */
function initialDate(cells: readonly HeatCell[], today: string): string | undefined {
  const past = cells.filter((cell) => cell.date <= today);
  return (past.at(-1) ?? cells[0])?.date;
}

type StudyCalendarProps = {
  weeks: readonly HeatWeek[];
  today: string;
};

/**
 * 学習カレンダー（GitHub の草のような表）。1マスが1日で、学習時間が長いほど色が濃い。
 *
 * マスにカーソルを合わせる・押す・キーボードで選ぶと、その日の日付と学習時間を下に出す。
 * キーボードでは Tab で入れるのを1マスだけにし（80以上のマスを Tab で順にたどらずに済むように）、
 * 中は矢印キーで移る
 */
export function StudyCalendar({ weeks, today }: StudyCalendarProps) {
  // カーソルを合わせているマス
  const [hovered, setHovered] = useState<HeatCell | null>(null);
  // 押した・キーボードで選んだマスの日付
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const hintId = useId();

  // 期間の初日から最終日まで、1日ずつ並んだマス
  const cells = weeks.flatMap((week) => week.days).filter((day): day is HeatCell => day !== null);
  const studyDays = cells.filter((cell) => cell.minutes >= 1).length;
  const first = cells[0];
  const last = cells.at(-1);
  const labels = getMonthLabels(weeks);
  const indexByDate = new Map(cells.map((cell, index) => [cell.date, index]));

  const selected = cells.find((cell) => cell.date === selectedDate) ?? null;
  const tabStopDate = selected?.date ?? initialDate(cells, today);
  const shown = hovered ?? selected;

  const moveTo = (index: number) => {
    const target = cells[index];
    if (!target) return;
    setSelectedDate(target.date);
    buttonRefs.current.get(target.date)?.focus();
  };

  /** 押したキーで動く先（マスの番号）。動かないキーなら undefined、端で動けないなら null */
  const keyTarget = (key: string, index: number): number | null | undefined => {
    if (key === 'Home') return 0;
    if (key === 'End') return cells.length - 1;
    const step = KEY_STEPS[key];
    if (step === undefined) return undefined;
    // 期間の外へは動かない（端のマスで押しても、そのまま）
    const next = index + step;
    return next >= 0 && next < cells.length ? next : null;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = keyTarget(event.key, index);
    if (next === undefined) return;

    // 矢印キーで画面がスクロールしないようにする
    event.preventDefault();
    if (next !== null) moveTo(next);
  };

  return (
    <Card title="学習カレンダー">
      {/* 期間が長いと横に伸びるので、はみ出した分は横スクロールで見られるようにする */}
      <div className="overflow-x-auto p-1">
        <div
          role="group"
          aria-label={
            first && last
              ? `${formatDateWithWeekday(first.date)}から${formatDateWithWeekday(last.date)}までの学習カレンダー。学習した日は${studyDays}日`
              : '学習カレンダー'
          }
          aria-describedby={hintId}
          className="inline-grid grid-flow-col grid-rows-[auto_repeat(7,auto)] gap-[3px]"
          onMouseLeave={() => setHovered(null)}
        >
          <span />
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={index} aria-hidden className="pr-1.5 text-[11px] leading-[18px] text-muted">
              {label}
            </span>
          ))}

          {weeks.map((week, weekIndex) => (
            <div key={week.weekStart} className="contents">
              {/* 月の名前はマスより幅が広いので、列の幅を広げないよう重ねて置く */}
              <span aria-hidden className="relative h-4">
                <span className="absolute left-0 top-0 whitespace-nowrap text-[11px] leading-4 text-muted">
                  {labels[weekIndex]}
                </span>
              </span>
              {week.days.map((cell, dayIndex) => {
                if (!cell) return <span key={dayIndex} className={CELL} />;

                const index = indexByDate.get(cell.date) ?? 0;
                const isFuture = cell.date > today;
                return (
                  <button
                    key={cell.date}
                    ref={(element) => {
                      if (element) buttonRefs.current.set(cell.date, element);
                      else buttonRefs.current.delete(cell.date);
                    }}
                    type="button"
                    aria-label={cellLabel(cell, today)}
                    aria-current={cell.date === today ? 'date' : undefined}
                    tabIndex={cell.date === tabStopDate ? 0 : -1}
                    onMouseEnter={() => setHovered(cell)}
                    onClick={() => setSelectedDate(cell.date)}
                    onFocus={() => setSelectedDate(cell.date)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    className={[
                      CELL,
                      'focus-visible:outline-offset-1',
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
        <p id={hintId} className="sr-only">
          上下の矢印キーで1日、左右の矢印キーで1週移動します。
        </p>
      </div>

      {/* 読み上げではマスの名前を読むので、この欄は目で見る人向け（読み上げると同じ内容が2回になる） */}
      <p aria-hidden className="mt-2 min-h-5 text-[13px] leading-5">
        {shown ? (
          <span className="font-bold">{cellLabel(shown, today)}</span>
        ) : (
          <span className="text-muted">
            マスにカーソルを合わせる・押す・矢印キーで選ぶと、その日の学習時間が出ます。
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
