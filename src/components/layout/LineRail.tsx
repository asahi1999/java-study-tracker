import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';

import { weekRepository } from '@/db/repositories';
import { layoutRail, type RailSegment } from '@/lib/rail';
import { formatWeekRange, formatWeekRangeShort, WEEK_STATUS_LABELS } from '@/lib/week';
import type { WeekStatus } from '@/types';

// 駅の印。板と同じ色で塗り、後ろを通る線が駅のところで隠れるようにしている
const STATION_BASE =
  'relative z-10 grid h-6 place-items-center rounded-full border-2 font-num text-[11px] font-bold leading-none transition-colors';

const STATION_STATUS: Record<WeekStatus, string> = {
  not_started:
    'border-board-ink/45 bg-board text-board-muted hover:border-board-ink hover:text-board-ink',
  in_progress: 'animate-station border-board-ink bg-board-ink text-board',
  done: 'border-accent bg-accent text-accent-ink',
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
 * どの画面にいても現在地が分かり、駅を押すとその週の詳細へ移動できる
 */
export function LineRail() {
  const weeks = useLiveQuery(() => weekRepository.getAll());

  // 読み込み中は高さだけ確保し、表示されたときに下の内容が動かないようにする
  if (!weeks) return <div className="h-6" />;

  if (weeks.length === 0) {
    return <p className="text-xs leading-6 text-board-muted">週がまだありません</p>;
  }

  const { segments, columns } = layoutRail(weeks);

  return (
    <nav aria-label="ロードマップの現在地">
      <ol
        className="grid gap-y-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {segments.map((segment) => {
          const { week, start, span, lane } = segment;
          return (
            <li
              key={week.id}
              className={`relative flex h-6 items-center justify-center ${trackClassName(segment, columns)}`}
              style={{ gridColumn: `${start} / span ${span}`, gridRow: lane + 1 }}
            >
              <Link
                to={`/roadmap/${week.id}`}
                aria-label={`${formatWeekRange(week)} ${week.title}（${WEEK_STATUS_LABELS[week.status]}）`}
                title={`${formatWeekRange(week)} ${week.title}`}
                // 1週だけの駅は丸、複数週にまたがる駅はその長さの横長にする
                className={`${STATION_BASE} ${STATION_STATUS[week.status]} ${span === 1 ? 'w-6' : 'w-[calc(100%-0.5rem)]'}`}
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
