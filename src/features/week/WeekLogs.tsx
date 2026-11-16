import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { logRepository } from '@/db/repositories';
import { LogFormModal } from '@/features/logs/LogFormModal';
import { LOG_SOURCE_LABELS } from '@/features/logs/LogList';
import { formatDateWithWeekday, formatHours, formatMinutes } from '@/lib/format';
import type { Week } from '@/types';

type WeekLogsProps = {
  week: Week;
  /** ログを追加するダイアログで、週を選ぶ欄に出す週の一覧 */
  weeks: readonly Week[];
  today: string;
};

/** この週の学習ログの一覧と、合計時間・予定時間との比較 */
export function WeekLogs({ week, weeks, today }: WeekLogsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const logs = useLiveQuery(() => logRepository.getByWeek(week.id), [week.id]);

  if (!logs) return null;

  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const plannedMinutes = week.plannedHours * 60;
  const percent = plannedMinutes > 0 ? (totalMinutes / plannedMinutes) * 100 : 0;

  return (
    <Card
      title="学習ログ"
      action={
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus aria-hidden className="size-3.5" />
          ログを追加
        </Button>
      }
    >
      <p className="text-sm leading-none">
        <span className="text-lg font-bold">{formatMinutes(totalMinutes)}</span>
        <span className="text-muted"> / 予定 {formatHours(week.plannedHours)}</span>
      </p>
      <ProgressBar value={percent} label="予定時間に対する学習時間" className="mt-3" />

      {logs.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          この週の学習ログはまだありません。右下のタイマーで計測するか、「ログを追加」から記録できます。
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {logs.map((log) => (
            <li key={log.id} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  {formatDateWithWeekday(log.date)}
                  <span className="ml-2 text-xs text-muted">{LOG_SOURCE_LABELS[log.source]}</span>
                </span>
                <span className="shrink-0 font-bold">{formatMinutes(log.minutes)}</span>
              </div>
              {log.content && (
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{log.content}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <LogFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        weeks={weeks}
        today={today}
        defaultWeekId={week.id}
      />
    </Card>
  );
}
