import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { INPUT_CLASS, TEXTAREA_CLASS } from '@/components/ui/field';
import { FormField } from '@/components/ui/FormField';
import { stepRepository } from '@/db/repositories';
import { roadmapService } from '@/db/services/roadmapService';
import { STEP_TEXT_MAX, STEP_TITLE_MAX, stepInputSchema } from '@/lib/editorValidation';
import { formatStepNumber } from '@/lib/format';
import type { Step, Week } from '@/types';

import { DeleteGroupDialog, type GroupDeleteTarget } from './DeleteGroupDialog';
import { FormModal } from './FormModal';

type StepListProps = {
  steps: readonly Step[];
  weeks: readonly Week[];
};

type FormTarget = { step?: Step } | null;

/** ステップの一覧。追加・編集・削除（週が残っているステップは削除できない） */
export function StepList({ steps, weeks }: StepListProps) {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupDeleteTarget | null>(null);

  const weekCountOf = (stepId: string) => weeks.filter((week) => week.stepId === stepId).length;

  const handleDelete = async ({ id }: GroupDeleteTarget) => {
    // 確認している間に別のタブで週が足された場合は、repository が削除を止める
    await stepRepository.remove(id).catch(() => undefined);
    setDeleteTarget(null);
  };

  const editing = formTarget?.step;

  return (
    <Card
      title="ステップ"
      action={
        <Button size="sm" onClick={() => setFormTarget({})}>
          <Plus aria-hidden className="size-4" />
          ステップを追加
        </Button>
      }
    >
      <p className="mb-3 text-[13px] leading-relaxed text-muted">
        番号（①②…）は追加した順に付きます。削除しても、ほかのステップの番号は変わりません。
      </p>
      {steps.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="ステップがまだありません"
          description="「ステップを追加」から追加してください。週は、どれかのステップに入れる必要があります。"
        />
      ) : (
        <ul className="-mx-4 -mb-4 divide-y divide-line border-t border-line sm:-mx-5 sm:-mb-5">
          {steps.map((step) => {
            const weekCount = weekCountOf(step.id);
            const name = `${formatStepNumber(step.order)} ${step.title}`;
            return (
              <li key={step.id} className="px-4 py-3 sm:px-5">
                <p className="font-bold">
                  {name}
                  <span className="ml-2 text-xs font-normal text-muted">週{weekCount}件</span>
                </p>
                {(step.description || step.advice) && (
                  <dl className="mt-0.5 grid gap-0.5 text-[13px] leading-relaxed text-muted">
                    {step.description && (
                      <div>
                        <dt className="inline">学ぶ内容：</dt>
                        <dd className="inline">{step.description}</dd>
                      </div>
                    )}
                    {step.advice && (
                      <div>
                        <dt className="inline">アドバイス：</dt>
                        <dd className="inline">{step.advice}</dd>
                      </div>
                    )}
                  </dl>
                )}
                <div className="-mb-1 -ml-3 mt-1 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${name}を編集`}
                    onClick={() => setFormTarget({ step })}
                  >
                    <Pencil aria-hidden className="size-3.5" />
                    編集
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${name}を削除`}
                    onClick={() =>
                      setDeleteTarget({ kind: 'ステップ', id: step.id, name, weekCount })
                    }
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    削除
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FormModal
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        title={editing ? 'ステップを編集' : 'ステップを追加'}
        submitLabel={editing ? '変更を保存' : 'ステップを追加'}
        schema={stepInputSchema}
        initialValues={{
          title: editing?.title ?? '',
          description: editing?.description ?? '',
          advice: editing?.advice ?? '',
        }}
        onSubmit={(data) =>
          editing ? stepRepository.update(editing.id, data) : roadmapService.addStep(data)
        }
      >
        {({ values, errors, setValue }) => (
          <>
            <FormField label="名前" error={errors.title}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  maxLength={STEP_TITLE_MAX}
                  placeholder="例：Docker"
                  value={values.title}
                  onChange={(event) => setValue('title', event.target.value)}
                  className={INPUT_CLASS}
                />
              )}
            </FormField>
            <FormField label="学ぶ内容（任意）" error={errors.description}>
              {(control) => (
                <textarea
                  {...control}
                  rows={2}
                  maxLength={STEP_TEXT_MAX}
                  value={values.description}
                  onChange={(event) => setValue('description', event.target.value)}
                  className={TEXTAREA_CLASS}
                />
              )}
            </FormField>
            <FormField label="アドバイス（任意）" error={errors.advice}>
              {(control) => (
                <textarea
                  {...control}
                  rows={2}
                  maxLength={STEP_TEXT_MAX}
                  value={values.advice}
                  onChange={(event) => setValue('advice', event.target.value)}
                  className={TEXTAREA_CLASS}
                />
              )}
            </FormField>
          </>
        )}
      </FormModal>

      <DeleteGroupDialog
        target={deleteTarget}
        onConfirm={(target) => void handleDelete(target)}
        onClose={() => setDeleteTarget(null)}
      />
    </Card>
  );
}
