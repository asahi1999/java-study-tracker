import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarRange, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { logRepository, weekRepository } from '@/db/repositories';
import { roadmapService } from '@/db/services/roadmapService';
import { formatHours, formatStepNumber } from '@/lib/format';
import type { MoveDirection } from '@/lib/reorder';
import { formatWeekLabel, WEEK_STATUS_LABELS } from '@/lib/week';
import type { Month, Skill, Step, Week } from '@/types';

import { MoveButtons, type PendingMove } from './MoveButtons';
import { SkillEditor } from './SkillEditor';
import { getNewWeekValues, WeekFormModal } from './WeekFormModal';

type WeekListProps = {
  months: readonly Month[];
  steps: readonly Step[];
  /** 表示順に並んだ週 */
  weeks: readonly Week[];
  skills: readonly Skill[];
};

/** 追加・編集のダイアログの状態。null は閉じている */
type FormTarget = { week?: Week } | null;

/** 週の一覧。表示順の並び替え・追加・編集・削除と、チェック項目の編集 */
export function WeekList({ months, steps, weeks, skills }: WeekListProps) {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<Week | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const clearPendingMove = useCallback(() => setPendingMove(null), []);

  const monthById = new Map(months.map((month) => [month.id, month]));
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const skillsOf = (weekId: string) =>
    skills.filter((skill) => skill.weekId === weekId).sort((a, b) => a.order - b.order);
  // 週は月とステップの両方に入るので、どちらかが1つもないと追加できない（M7）
  const canAddWeek = months.length > 0 && steps.length > 0;

  const handleMove = (week: Week, position: number, direction: MoveDirection) => {
    setPendingMove({ id: week.id, direction, fromPosition: position });
    void roadmapService.moveWeek(week.id, direction);
  };

  const addButton = (
    <Button size="sm" onClick={() => setFormTarget({})} disabled={!canAddWeek}>
      <Plus aria-hidden className="size-4" />
      週を追加
    </Button>
  );

  return (
    <Card title="週とチェック項目" action={addButton}>
      {!canAddWeek && (
        <p className="mb-3 text-[13px] leading-relaxed text-muted">
          週を追加するには、先に月とステップを1つ以上追加してください。
        </p>
      )}
      <p className="mb-3 text-[13px] leading-relaxed text-muted">
        上下のボタンで変わるのは表示の順番だけです。予定日は週番号から計算します。
      </p>

      {weeks.length === 0 ? (
        <EmptyState icon={CalendarRange} title="週がまだありません" />
      ) : (
        <ol className="-mx-4 -mb-4 divide-y divide-line border-t border-line sm:-mx-5 sm:-mb-5">
          {weeks.map((week, position) => (
            <WeekRow
              key={week.id}
              week={week}
              position={position}
              count={weeks.length}
              month={monthById.get(week.monthId)}
              step={stepById.get(week.stepId)}
              skills={skillsOf(week.id)}
              onMove={(direction) => handleMove(week, position, direction)}
              pendingMove={pendingMove?.id === week.id ? pendingMove : null}
              onMoveFocused={clearPendingMove}
              onEdit={() => setFormTarget({ week })}
              onDelete={() => setDeleteTarget(week)}
            />
          ))}
        </ol>
      )}

      <WeekFormModal
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        months={months}
        steps={steps}
        week={formTarget?.week}
        newValues={getNewWeekValues(weeks, months, steps)}
      />
      <DeleteWeekDialog
        week={deleteTarget}
        skillCount={deleteTarget ? skillsOf(deleteTarget.id).length : 0}
        onClose={() => setDeleteTarget(null)}
      />
    </Card>
  );
}

type WeekRowProps = {
  week: Week;
  position: number;
  count: number;
  month: Month | undefined;
  step: Step | undefined;
  skills: readonly Skill[];
  onMove: (direction: MoveDirection) => void;
  pendingMove: PendingMove | null;
  onMoveFocused: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function WeekRow({ week, skills, month, step, ...props }: WeekRowProps) {
  const [expanded, setExpanded] = useState(false);
  const label = formatWeekLabel(week);
  const skillsId = `skills-${week.id}`;

  return (
    <li className="px-2 py-3 sm:px-3">
      <div className="flex gap-2">
        <MoveButtons
          orientation="vertical"
          label={label}
          position={props.position}
          count={props.count}
          onMove={props.onMove}
          pending={props.pendingMove}
          onFocused={props.onMoveFocused}
        />
        <div className="min-w-0 flex-1">
          <p className="pt-1 font-bold leading-snug">{label}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            {month?.title ?? '月なし'}
            <span aria-hidden> ・ </span>
            {step ? `${formatStepNumber(step.order)} ${step.title}` : 'ステップなし'}
            <span aria-hidden> ・ </span>
            予定{formatHours(week.plannedHours)}
            <span aria-hidden> ・ </span>
            {WEEK_STATUS_LABELS[week.status]}
          </p>
          <div className="-ml-3 mt-1 flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              aria-controls={expanded ? skillsId : undefined}
              onClick={() => setExpanded((value) => !value)}
            >
              <ListChecks aria-hidden className="size-3.5" />
              チェック項目（{skills.length}件）
            </Button>
            <Button variant="ghost" size="sm" aria-label={`${label}を編集`} onClick={props.onEdit}>
              <Pencil aria-hidden className="size-3.5" />
              編集
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${label}を削除`}
              onClick={props.onDelete}
            >
              <Trash2 aria-hidden className="size-3.5" />
              削除
            </Button>
          </div>
        </div>
      </div>
      {/* スマホでは入力欄が狭くならないよう、項目の欄は行の幅いっぱいに広げる */}
      {expanded && <SkillEditor id={skillsId} week={week} skills={skills} />}
    </li>
  );
}

type DeleteWeekDialogProps = {
  week: Week | null;
  skillCount: number;
  onClose: () => void;
};

/** 週の削除の確認。学習ログは消さずに残すことを伝える */
function DeleteWeekDialog({ week, skillCount, onClose }: DeleteWeekDialogProps) {
  const logCount = useLiveQuery(
    async () => (week ? (await logRepository.getByWeek(week.id)).length : 0),
    [week?.id],
  );

  const handleConfirm = async () => {
    if (!week) return;
    await weekRepository.remove(week.id);
    onClose();
  };

  return (
    <ConfirmDialog
      open={week !== null}
      title="週を削除しますか？"
      confirmLabel="削除する"
      onConfirm={() => void handleConfirm()}
      onCancel={onClose}
    >
      {week && <p className="font-bold">{formatWeekLabel(week)}</p>}
      <p>チェック項目（{skillCount}件）・メモ・GitHubのURL・開始日・完了日も一緒に消えます。</p>
      <p>
        この週の学習ログ（{logCount ?? 0}
        件）は消さずに残し、「週の指定なし」にします。累計の学習時間や連続学習日数は変わりません。
      </p>
      <p className="text-muted">削除すると元に戻せません。</p>
    </ConfirmDialog>
  );
}
