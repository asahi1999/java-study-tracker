import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { INPUT_CLASS, TEXTAREA_CLASS } from '@/components/ui/field';
import { FormField } from '@/components/ui/FormField';
import { monthRepository } from '@/db/repositories';
import { roadmapService } from '@/db/services/roadmapService';
import { MILESTONE_MAX, MONTH_TITLE_MAX, monthInputSchema } from '@/lib/editorValidation';
import type { Month, Week } from '@/types';

import { DeleteGroupDialog, type GroupDeleteTarget } from './DeleteGroupDialog';
import { FormModal } from './FormModal';

type MonthListProps = {
  months: readonly Month[];
  weeks: readonly Week[];
};

type FormTarget = { month?: Month } | null;

/** 月の一覧。追加・編集・削除（週が残っている月は削除できない） */
export function MonthList({ months, weeks }: MonthListProps) {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupDeleteTarget | null>(null);

  const weekCountOf = (monthId: string) => weeks.filter((week) => week.monthId === monthId).length;

  const handleDelete = async ({ id }: GroupDeleteTarget) => {
    // 確認している間に別のタブで週が足された場合は、repository が削除を止める
    await monthRepository.remove(id).catch(() => undefined);
    setDeleteTarget(null);
  };

  const editing = formTarget?.month;

  return (
    <Card
      title="月"
      action={
        <Button size="sm" onClick={() => setFormTarget({})}>
          <Plus aria-hidden className="size-4" />
          月を追加
        </Button>
      }
    >
      {months.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="月がまだありません"
          description="「月を追加」から追加してください。週は、どれかの月に入れる必要があります。"
        />
      ) : (
        <ul className="-mx-4 -mb-4 divide-y divide-line border-t border-line sm:-mx-5 sm:-mb-5">
          {months.map((month) => {
            const weekCount = weekCountOf(month.id);
            return (
              <li key={month.id} className="px-4 py-3 sm:px-5">
                <p className="font-bold">
                  {month.title}
                  <span className="ml-2 text-xs font-normal text-muted">週{weekCount}件</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  {month.milestone || 'マイルストーンは未設定です'}
                </p>
                <div className="-mb-1 -ml-3 mt-1 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${month.title}を編集`}
                    onClick={() => setFormTarget({ month })}
                  >
                    <Pencil aria-hidden className="size-3.5" />
                    編集
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${month.title}を削除`}
                    onClick={() =>
                      setDeleteTarget({ kind: '月', id: month.id, name: month.title, weekCount })
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
        title={editing ? '月を編集' : '月を追加'}
        submitLabel={editing ? '変更を保存' : '月を追加'}
        schema={monthInputSchema}
        initialValues={{ title: editing?.title ?? '', milestone: editing?.milestone ?? '' }}
        onSubmit={(data) =>
          editing ? monthRepository.update(editing.id, data) : roadmapService.addMonth(data)
        }
      >
        {({ values, errors, setValue }) => (
          <>
            <FormField label="名前" error={errors.title}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  maxLength={MONTH_TITLE_MAX}
                  placeholder="例：4ヶ月目"
                  value={values.title}
                  onChange={(event) => setValue('title', event.target.value)}
                  className={INPUT_CLASS}
                />
              )}
            </FormField>
            <FormField label="マイルストーン（任意）" error={errors.milestone}>
              {(control) => (
                <textarea
                  {...control}
                  rows={3}
                  maxLength={MILESTONE_MAX}
                  placeholder="例：作ったアプリをデプロイして公開できる"
                  value={values.milestone}
                  onChange={(event) => setValue('milestone', event.target.value)}
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
