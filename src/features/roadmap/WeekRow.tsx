import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDateRange } from '@/lib/format';
import { formatWeekRange } from '@/lib/week';
import type { WeekView } from '@/lib/weekView';

import { WeekMark } from './WeekMark';
import { WeekStatusBadge } from './WeekStatusBadge';

// 駅の印をつなぐ縦の線。行ごとに自分の分を描き、つなげて1本の線に見せる。
// 印の中心（上から 2.25rem）を境に、上と下で色を変えられるようにしている
const LINE_BASE = 'before:absolute before:left-7 before:w-[3px] before:-translate-x-1/2';
const LINE_TRAVELED = 'before:bg-progress';
const LINE_AHEAD = 'before:bg-subtle';
// 上だけ進んだ色（前の駅は完成、この駅はまだ）
const LINE_ARRIVED =
  'before:bg-[linear-gradient(rgb(var(--progress))_2.25rem,rgb(var(--subtle))_2.25rem)]';
// 下だけ進んだ色（前の駅を飛ばして、この駅を先に完成させた）
const LINE_DEPARTED =
  'before:bg-[linear-gradient(rgb(var(--subtle))_2.25rem,rgb(var(--progress))_2.25rem)]';

function lineClassName(
  departed: boolean,
  previousDeparted: boolean,
  isFirst: boolean,
  isLast: boolean,
): string {
  // 1駅しかなければ、つなぐ線はいらない
  if (isFirst && isLast) return '';

  // 駅と駅の間の線は、手前の駅を出た（完成した）ら「進んだ区間」の色にする。
  // 印より上の線は前の駅、下の線はこの駅が完成したかどうかで色が決まる
  if (isFirst) {
    return `${LINE_BASE} before:top-9 before:bottom-0 ${departed ? LINE_TRAVELED : LINE_AHEAD}`;
  }
  if (isLast) {
    return `${LINE_BASE} before:top-0 before:h-9 ${previousDeparted ? LINE_TRAVELED : LINE_AHEAD}`;
  }

  const color =
    previousDeparted && departed
      ? LINE_TRAVELED
      : previousDeparted
        ? LINE_ARRIVED
        : departed
          ? LINE_DEPARTED
          : LINE_AHEAD;
  return `${LINE_BASE} before:top-0 before:bottom-0 ${color}`;
}

type WeekRowProps = {
  view: WeekView;
  /** 作るものの下に出す補足（月ごとの表示ではステップ名、ステップごとの表示では月の名前） */
  context: string;
  /** 1つ前の行の週が完成しているか（駅と駅の間の線の色に使う） */
  previousDone: boolean;
  isFirst: boolean;
  isLast: boolean;
};

/** ロードマップ一覧の1行。縦の路線図の「駅」にあたる */
export function WeekRow({ view, context, previousDone, isFirst, isLast }: WeekRowProps) {
  const { week, range, displayStatus, progress, isCurrent } = view;

  return (
    <li
      className={`relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 pb-3 last:pb-0 ${lineClassName(week.status === 'done', previousDone, isFirst, isLast)}`}
    >
      <div className="relative z-10 flex justify-center pt-4">
        <WeekMark week={week} />
      </div>

      <article className="relative rounded-md border border-line bg-surface p-4 transition-colors hover:border-ink">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-bold leading-snug">
            {/* カード全体を押せるように、リンクの当たり判定をカードいっぱいに広げている */}
            <Link
              to={`/roadmap/${week.id}`}
              className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[rgb(var(--focus))]"
            >
              {/* 週番号は印（WeekMark）で見せているので、文字は読み上げ用にだけ入れる */}
              <span className="sr-only">{formatWeekRange(week)}</span> {week.title}
            </Link>
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {isCurrent && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold leading-none text-accent-ink">
                今週
              </span>
            )}
            <WeekStatusBadge status={displayStatus} />
          </div>
        </div>

        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {context}
          <span aria-hidden> ・ </span>
          予定 {formatDateRange(range)}
        </p>

        {/* 進捗バーは短くする。行いっぱいに伸ばすと、完成した週の濃い帯が並んで一覧が重く見えるため */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ProgressBar
            value={progress.percent}
            label={`${formatWeekRange(week)}の進捗`}
            className="w-28 sm:w-40"
          />
          <p className="text-[13px] leading-none text-muted">
            <span className="font-bold text-ink">{progress.checked}</span> / {progress.total} 項目
          </p>
          {week.repoUrl && (
            <a
              href={week.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              // カード全体のリンクより手前に出して、このリンクを押せるようにする
              className="relative z-10 ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold underline underline-offset-2"
            >
              <ExternalLink aria-hidden className="size-3.5" />
              GitHub
            </a>
          )}
        </div>
      </article>
    </li>
  );
}
