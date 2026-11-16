import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';

import { settingsRepository, weekRepository } from '@/db/repositories';
import { useToday } from '@/hooks/useToday';
import { formatDateRange } from '@/lib/format';
import { getTodayPosition, layoutRail, type RailSegment } from '@/lib/rail';
import {
  buildSchedule,
  getDisplayStatus,
  isDateInRange,
  type PlannedRange,
  WEEK_DISPLAY_STATUS_LABELS,
  type WeekDisplayStatus,
} from '@/lib/schedule';
import { formatWeekRange, formatWeekRangeShort } from '@/lib/week';
import type { WeekStatus } from '@/types';

// 駅の印。板と同じ色で塗り、後ろを通る線が駅のところで隠れるようにしている
const STATION_BASE =
  'relative z-10 grid h-6 place-items-center rounded-full border-2 font-num text-[11px] font-bold leading-none transition-colors';

const STATION_STATUS: Record<WeekDisplayStatus, string> = {
  not_started:
    'border-board-ink/45 bg-board text-board-muted hover:border-board-ink hover:text-board-ink',
  in_progress: 'animate-station border-board-ink bg-board-ink text-board',
  done: 'border-accent bg-accent text-accent-ink',
  late: 'border-board-alert bg-board-alert text-white',
};

// 本線の線。駅ごとに自分のマスの分を描き、つなげて1本の線に見せる。
// 進んだ区間は黄色、これからの区間は薄い色にする。進行中の駅は「駅に着いたところ」なので左半分だけ黄色
const TRACK_BASE = 'before:absolute before:top-1/2 before:h-[3px] before:-translate-y-1/2';

const TRACK_STATUS: Record<WeekStatus, string> = {
  not_started: 'before:bg-board-ink/25',
  in_progress:
    'before:bg-[linear-gradient(90deg,rgb(var(--accent))_50%,rgb(var(--board-ink)/0.25)_50%)]',
  done: 'before:bg-accent',
};

// 2段目以降（並行する週）は、上の駅と短い縦線でつなぐ。路線図の「乗換」の印と同じ見せ方
const TRANSFER =
  'before:absolute before:-top-1 before:left-1/2 before:h-1 before:w-[3px] before:-translate-x-1/2 before:bg-board-ink/45';

function trackClassName({ week, start, span, lane }: RailSegment, columns: number): string {
  if (lane > 0) return TRANSFER;

  // 線は最初の駅の中心から最後の駅の中心までにする（端からはみ出さないように）
  const isFirst = start === 1;
  const isLast = start + span - 1 === columns;
  const inset = `${isFirst ? 'before:left-1/2' : 'before:left-0'} ${isLast ? 'before:right-1/2' : 'before:right-0'}`;

  return `${TRACK_BASE} ${TRACK_STATUS[week.status]} ${inset}`;
}

/**
 * ロードマップ全体を「路線」として見せるバー。1列が1週で、週1つが駅1つにあたる。
 * どの画面にいても現在地が分かり、駅を押すとその週の詳細へ移動できる。
 * 駅の色は実際の進み具合、上の▼は予定の上での今日の位置を表す
 */
export function LineRail() {
  const today = useToday();
  const data = useLiveQuery(async () => {
    const [weeks, settings] = await Promise.all([
      weekRepository.getAll(),
      settingsRepository.get(),
    ]);
    return { weeks, settings };
  });

  // 読み込み中は高さだけ確保し、表示されたときに下の内容が動かないようにする
  if (!data) return <div className="h-8" />;

  if (data.weeks.length === 0) {
    return <p className="pt-2 text-xs leading-6 text-board-muted">週がまだありません</p>;
  }

  const layout = layoutRail(data.weeks);
  const ranges: ReadonlyMap<string, PlannedRange> = data.settings
    ? buildSchedule(data.weeks, data.settings)
    : new Map();
  const todayPosition = getTodayPosition(layout, ranges, today);

  return (
    <nav aria-label="ロードマップの現在地" className="relative pt-2">
      {todayPosition !== null && (
        <span
          aria-hidden
          title="今日"
          className="absolute top-0 size-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-accent"
          style={{ left: `${todayPosition * 100}%` }}
        />
      )}
      <ol
        className="grid gap-y-1"
        style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}
      >
        {layout.segments.map((segment) => {
          const { week, start, span, lane } = segment;
          const range = ranges.get(week.id);
          const status = range ? getDisplayStatus(week, range, today) : week.status;
          const isCurrent = range !== undefined && isDateInRange(today, range);

          const name = `${formatWeekRange(week)} ${week.title}`;
          const statusLabel = `${WEEK_DISPLAY_STATUS_LABELS[status]}${isCurrent ? '・今週' : ''}`;

          return (
            <li
              key={week.id}
              className={`relative flex h-6 items-center justify-center ${trackClassName(segment, layout.columns)}`}
              style={{ gridColumn: `${start} / span ${span}`, gridRow: lane + 1 }}
            >
              <Link
                to={`/roadmap/${week.id}`}
                aria-label={`${name}（${statusLabel}）`}
                title={range ? `${name}（予定 ${formatDateRange(range)}）` : name}
                // 1週だけの駅は丸、複数週にまたがる駅はその長さの横長にする
                className={`${STATION_BASE} ${STATION_STATUS[status]} ${span === 1 ? 'w-6' : 'w-[calc(100%-0.5rem)]'}`}
              >
                {formatWeekRangeShort(week)}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
