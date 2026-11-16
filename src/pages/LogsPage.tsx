import { useLiveQuery } from 'dexie-react-hooks';
import { NotebookPen, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { logRepository } from '@/db/repositories';
import { logService } from '@/db/services/logService';
import { LogFilters } from '@/features/logs/LogFilters';
import { LogFormModal } from '@/features/logs/LogFormModal';
import { LogList } from '@/features/logs/LogList';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import { useToday } from '@/hooks/useToday';
import { formatDateWithWeekday, formatMinutes } from '@/lib/format';
import { filterLogs, isLogFilterEmpty, type LogFilter } from '@/lib/logFilter';
import { sumMinutes } from '@/lib/stats';
import { pickDefaultWeekId } from '@/lib/timer';
import { buildWeekViews } from '@/lib/weekView';
import type { StudyLog } from '@/types';

// 絞り込みの条件はURLに持たせる。再読み込みや「戻る」でも同じ条件に戻れるようにするため
const PARAM_NAMES: Record<keyof LogFilter, string> = {
  from: 'from',
  to: 'to',
  weekId: 'week',
  stepId: 'step',
};

/** 追加・編集のダイアログの状態。null は閉じている */
type FormTarget = { log?: StudyLog } | null;

export function LogsPage() {
  const data = useRoadmapData();
  const logs = useLiveQuery(() => logRepository.getAll());
  const today = useToday();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyLog | null>(null);

  const filter: LogFilter = {
    from: searchParams.get(PARAM_NAMES.from) ?? '',
    to: searchParams.get(PARAM_NAMES.to) ?? '',
    weekId: searchParams.get(PARAM_NAMES.weekId) ?? '',
    stepId: searchParams.get(PARAM_NAMES.stepId) ?? '',
  };

  const setFilter = (next: LogFilter) => {
    const params = new URLSearchParams();
    for (const key of Object.keys(PARAM_NAMES) as (keyof LogFilter)[]) {
      if (next[key]) params.set(PARAM_NAMES[key], next[key]);
    }
    setSearchParams(params, { replace: true });
  };

  const addButton = (
    <Button variant="primary" onClick={() => setFormTarget({})}>
      <Plus aria-hidden className="size-4" />
      ログを追加
    </Button>
  );

  if (!data || !logs) {
    return (
      <>
        <PageHeader title="学習ログ" />
        <LoadingText />
      </>
    );
  }

  const filteredLogs = filterLogs(logs, filter, data.weeks);
  // 追加するときの週の初期値は、タイマーと同じく「今週」にする
  const defaultWeekId = pickDefaultWeekId(
    buildWeekViews(data.weeks, data.skills, data.settings, today),
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await logService.remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <PageHeader
        title="学習ログ"
        description="タイマーで計測した時間と、手動で追加した時間の記録です。"
        actions={logs.length > 0 ? addButton : undefined}
      />

      {logs.length === 0 ? (
        <Card>
          <EmptyState
            icon={NotebookPen}
            title="学習ログはまだありません"
            description="画面右下のタイマーで計測すると、ここに記録されます。あとから手動で追加することもできます。"
            action={addButton}
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          <LogFilters
            filter={filter}
            onChange={setFilter}
            onClear={() => setSearchParams({}, { replace: true })}
            weeks={data.weeks}
            steps={data.steps}
          />

          <p role="status" className="text-sm leading-none">
            <span className="font-bold">{filteredLogs.length}件</span>
            <span aria-hidden> ・ </span>
            合計 <span className="font-bold">{formatMinutes(sumMinutes(filteredLogs))}</span>
            {!isLogFilterEmpty(filter) && (
              <span className="text-muted">（全{logs.length}件から絞り込み中）</span>
            )}
          </p>

          {filteredLogs.length === 0 ? (
            <Card>
              <p className="text-sm leading-relaxed text-muted">
                条件に合う学習ログはありません。期間や週を変えるか、絞り込みを解除してください。
              </p>
            </Card>
          ) : (
            <LogList
              logs={filteredLogs}
              weeks={data.weeks}
              onEdit={(log) => setFormTarget({ log })}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      )}

      <LogFormModal
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        weeks={data.weeks}
        today={today}
        log={formTarget?.log}
        defaultWeekId={defaultWeekId}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="学習ログを削除しますか？"
        confirmLabel="削除する"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteTarget && (
          <>
            <p className="font-bold">
              {formatDateWithWeekday(deleteTarget.date)} ・ {formatMinutes(deleteTarget.minutes)}
            </p>
            {deleteTarget.content && <p className="break-words">{deleteTarget.content}</p>}
          </>
        )}
        <p className="text-muted">
          削除すると元に戻せません。合計時間や連続学習日数も、このログを除いて計算し直されます。
        </p>
      </ConfirmDialog>
    </>
  );
}
