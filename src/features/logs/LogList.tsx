import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { formatDateWithWeekday, formatMinutes } from '@/lib/format';
import { formatWeekLabel } from '@/lib/week';
import type { StudyLog, StudyLogSource, Week } from '@/types';

export const LOG_SOURCE_LABELS: Record<StudyLogSource, string> = {
  timer: 'タイマー',
  manual: '手動',
};

type LogListProps = {
  /** 新しい順に並んだ学習ログ */
  logs: readonly StudyLog[];
  weeks: readonly Week[];
  onEdit: (log: StudyLog) => void;
  onDelete: (log: StudyLog) => void;
};

/** 学習ログの一覧。日付・週・時間・内容・記録の方法を出す */
export function LogList({ logs, weeks, onEdit, onDelete }: LogListProps) {
  const weekById = new Map(weeks.map((week) => [week.id, week]));

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-surface">
      {logs.map((log) => {
        const week = log.weekId ? weekById.get(log.weekId) : undefined;
        return (
          <li key={log.id} className="px-4 py-3 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm">
                <span className="font-bold">{formatDateWithWeekday(log.date)}</span>
                <span className="ml-2 text-xs text-muted">{LOG_SOURCE_LABELS[log.source]}</span>
              </p>
              <p className="shrink-0 font-bold">{formatMinutes(log.minutes)}</p>
            </div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
              {week ? formatWeekLabel(week) : '週の指定なし'}
            </p>
            {log.content && (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {log.content}
              </p>
            )}
            <div className="-mb-1 -ml-3 mt-1 flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(log)}>
                <Pencil aria-hidden className="size-3.5" />
                編集
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(log)}>
                <Trash2 aria-hidden className="size-3.5" />
                削除
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
