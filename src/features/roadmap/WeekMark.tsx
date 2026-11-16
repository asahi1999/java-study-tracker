import { formatWeekRangeShort } from '@/lib/week';
import type { Week, WeekStatus } from '@/types';

// 路線バーの駅と同じ意味になるようにそろえている（完成した駅は黄色で塗る）。
// 白地では黄色の輪郭が見えにくいので、濃紺の線で囲む
const STATUS: Record<WeekStatus, string> = {
  not_started: 'border-status-gray bg-surface text-muted',
  in_progress: 'border-ink bg-surface text-ink',
  done: 'border-ink bg-accent text-accent-ink dark:border-accent',
};

type WeekMarkProps = {
  week: Pick<Week, 'weekStart' | 'weekEnd' | 'status'>;
  className?: string;
};

/**
 * 週を表す印。駅ナンバリングを手本に、「W」と週番号を丸で囲む。
 * 1週だけなら丸、複数週にまたがるなら横長になる。
 * 週番号は別に文字で読み上げるので、この印は読み上げの対象から外している
 */
export function WeekMark({ week, className }: WeekMarkProps) {
  return (
    <span
      aria-hidden
      className={[
        'inline-flex h-10 min-w-10 flex-col items-center justify-center gap-px rounded-full border-[2.5px] px-2 font-num font-bold leading-none',
        STATUS[week.status],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-[8px] tracking-widest">W</span>
      <span className="text-[15px]">{formatWeekRangeShort(week)}</span>
    </span>
  );
}
