import { Check, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useCallback, useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ERROR_CLASS, INPUT_CLASS } from '@/components/ui/field';
import { skillRepository } from '@/db/repositories';
import { roadmapService } from '@/db/services/roadmapService';
import { SKILL_LABEL_MAX, skillLabelSchema } from '@/lib/editorValidation';
import type { MoveDirection } from '@/lib/reorder';
import type { Skill, Week } from '@/types';

import { MoveButtons, type PendingMove } from './MoveButtons';

/** 入力チェックの最初のエラー */
function firstError(value: string): string | null {
  const result = skillLabelSchema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? '項目を入力してください');
}

type SkillEditorProps = {
  id: string;
  week: Week;
  /** この週の項目（表示順） */
  skills: readonly Skill[];
};

/** 週のチェック項目の編集。名前の変更・並び替え・削除・追加 */
export function SkillEditor({ id, week, skills }: SkillEditorProps) {
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const clearPendingMove = useCallback(() => setPendingMove(null), []);

  const handleMove = (skill: Skill, position: number, direction: MoveDirection) => {
    setPendingMove({ id: skill.id, direction, fromPosition: position });
    void roadmapService.moveSkill(skill.id, direction);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await skillRepository.remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div id={id} className="mt-2 grid gap-3 rounded border border-line p-3 sm:ml-10">
      {week.status === 'done' && (
        <p className="text-[12px] leading-relaxed text-muted">
          この週は完成しています。足した項目にチェックを付けるには、週の詳細で完成を取り消してください。
        </p>
      )}

      {skills.length === 0 ? (
        <p className="text-[13px] text-muted">チェック項目はまだありません。</p>
      ) : (
        <ol className="grid gap-2">
          {skills.map((skill, position) => (
            <li key={skill.id} className="flex items-start gap-1.5">
              <div className="pt-1">
                <MoveButtons
                  label={`「${skill.label}」`}
                  position={position}
                  count={skills.length}
                  onMove={(direction) => handleMove(skill, position, direction)}
                  pending={pendingMove?.id === skill.id ? pendingMove : null}
                  onFocused={clearPendingMove}
                />
              </div>
              <SkillLabelInput skill={skill} position={position} />
              <Button
                variant="ghost"
                size="sm"
                aria-label={`「${skill.label}」を削除`}
                onClick={() => setDeleteTarget(skill)}
                className="mt-1 shrink-0 px-2"
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <AddSkillForm weekId={week.id} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="チェック項目を削除しますか？"
        confirmLabel="削除する"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteTarget && <p className="font-bold">{deleteTarget.label}</p>}
        {deleteTarget?.checked && <p>この項目はチェック済みです。チェックした記録も消えます。</p>}
        <p className="text-muted">
          削除すると元に戻せません。進捗率は、残った項目で計算し直されます。
        </p>
      </ConfirmDialog>
    </div>
  );
}

/** 項目の名前の入力欄。Enter か、ほかの場所へ移ったときに保存する。Esc で元に戻す */
function SkillLabelInput({ skill, position }: { skill: Skill; position: number }) {
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (draft === null) return;
    const message = firstError(draft);
    if (message) {
      setError(message);
      return;
    }
    const label = draft.trim();
    setDraft(null);
    setError(null);
    if (label !== skill.label) void skillRepository.update(skill.id, { label });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 日本語の変換を確定する Enter では保存しない
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      save();
    }
    if (event.key === 'Escape' && draft !== null) {
      // ダイアログの中で使っても、ダイアログごと閉じないようにする
      event.preventDefault();
      setDraft(null);
      setError(null);
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label={`${position + 1}番目の項目`}
          maxLength={SKILL_LABEL_MAX}
          value={draft ?? skill.label}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onBlur={save}
          onKeyDown={handleKeyDown}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className={`${INPUT_CLASS} !mt-0 min-w-0 flex-1`}
        />
        {skill.checked && (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-status-green-fg">
            <Check aria-hidden className="size-3.5" />
            チェック済み
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}

/** 項目を週の末尾に足す。続けて入力できるよう、足したあとも入力欄にとどまる */
function AddSkillForm({ weekId }: { weekId: string }) {
  const inputId = useId();
  const errorId = useId();
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = firstError(label);
    if (message) {
      setError(message);
      return;
    }
    await roadmapService.addSkill(weekId, label.trim());
    setLabel('');
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className="sr-only">
        追加する項目
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          maxLength={SKILL_LABEL_MAX}
          placeholder="例：ラムダ式"
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
            setError(null);
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className={`${INPUT_CLASS} !mt-0 min-w-0 flex-1`}
        />
        <Button type="submit" size="md" className="shrink-0">
          <Plus aria-hidden className="size-4" />
          追加
        </Button>
      </div>
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </form>
  );
}
