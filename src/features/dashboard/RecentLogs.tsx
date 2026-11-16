import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { formatDateWithWeekday, formatMinutes } from '@/lib/format';
import { formatWeekRange } from '@/lib/week';
import type { StudyLog, Week } from '@/types';

const RECENT_LOG_COUNT = 3;

type RecentLogsProps = {
  /** 新しい順に並んだ学習ログ */
  logs: readonly StudyLog[];
  weeks: readonly Week[];
};

/** 最近の学習ログ（新しい順に3件） */
export function RecentLogs({ logs, weeks }: RecentLogsProps) {
  const weekLabel = (weekId: string | null) => {
    const week = weeks.find(({ id }) => id === weekId);
    return week ? `${formatWeekRange(week)} ${week.title}` : '週の指定なし';
  };

  return (
    <Card
      title="最近の学習ログ"
      action={
        logs.length > 0 && (
          <Link to="/logs" className="text-[13px] font-bold underline underline-offset-2">
            ログをすべて見る
          </Link>
        )
      }
    >
      {logs.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          学習ログはまだありません。記録すると、最近の{RECENT_LOG_COUNT}件がここに出ます。
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {logs.slice(0, RECENT_LOG_COUNT).map((log) => (
            <li key={log.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{formatDateWithWeekday(log.date)}</span>
                <span className="shrink-0 font-bold">{formatMinutes(log.minutes)}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                {weekLabel(log.weekId)}
              </p>
              {log.content && <p className="mt-0.5 text-[13px] leading-relaxed">{log.content}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
