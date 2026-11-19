import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ERROR_CLASS, INPUT_CLASS } from '@/components/ui/field';
import { FormField } from '@/components/ui/FormField';
import { settingsRepository } from '@/db/repositories';
import { diffInDays } from '@/lib/date';
import { formatFullDate } from '@/lib/format';
import { BREAK_LABEL_MAX, breakPeriodInputSchema } from '@/lib/settingsValidation';
import { getFieldErrors } from '@/lib/validation';
import type { BreakPeriod, Settings } from '@/types';

const EMPTY_INPUT = { label: '', start: '', end: '' };

function formatPeriod({ start, end }: BreakPeriod): string {
  const days = diffInDays(end, start) + 1;
  return `${formatFullDate(start)}〜${formatFullDate(end)}・${days}日間`;
}

/** 休止期間の追加・削除。休止期間の日は予定の日数に数えない（Q1） */
export function BreakPeriodSettings({ settings }: { settings: Settings }) {
  const [deleteTarget, setDeleteTarget] = useState<BreakPeriod | null>(null);
  const periods = [...settings.breakPeriods].sort((a, b) => a.start.localeCompare(b.start));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await settingsRepository.update({
      breakPeriods: settings.breakPeriods.filter((period) => period.id !== deleteTarget.id),
    });
    setDeleteTarget(null);
  };

  return (
    <Card title="休止期間">
      <p className="text-[13px] leading-relaxed text-muted">
        休止期間の日は、予定の日数に数えません。休止期間をまたぐ週は終了日が延び、それより後の週の予定日もうしろにずれます。
      </p>

      {periods.length === 0 ? (
        <p className="mt-3 text-sm">休止期間はまだ登録されていません。</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded border border-line">
          {periods.map((period) => (
            <li key={period.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{period.label}</p>
                <p className="text-[13px] text-muted">{formatPeriod(period)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${period.label}を削除`}
                onClick={() => setDeleteTarget(period)}
              >
                <Trash2 aria-hidden className="size-3.5" />
                削除
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddBreakPeriodForm periods={settings.breakPeriods} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="休止期間を削除しますか？"
        confirmLabel="削除する"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteTarget && (
          <>
            <p className="font-bold">{deleteTarget.label}</p>
            <p>{formatPeriod(deleteTarget)}</p>
          </>
        )}
        <p className="text-muted">削除すると、この期間をまたぐ週から後の予定日が前に戻ります。</p>
      </ConfirmDialog>
    </Card>
  );
}

function AddBreakPeriodForm({ periods }: { periods: readonly BreakPeriod[] }) {
  const [values, setValues] = useState(EMPTY_INPUT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = (key: keyof typeof EMPTY_INPUT, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = breakPeriodInputSchema.safeParse(values);
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }
    try {
      await settingsRepository.update({
        breakPeriods: [...periods, { id: crypto.randomUUID(), ...result.data }],
      });
      setValues(EMPTY_INPUT);
      setErrors({});
    } catch {
      setErrors({ form: '保存できませんでした。もう一度試してください。' });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="休止期間を追加"
      className="mt-4 grid gap-3 border-t border-line pt-4"
    >
      <FormField label="名前" error={errors.label}>
        {(control) => (
          <input
            {...control}
            type="text"
            maxLength={BREAK_LABEL_MAX}
            placeholder="例：年末年始"
            value={values.label}
            onChange={(event) => setValue('label', event.target.value)}
            className={`${INPUT_CLASS} sm:max-w-80`}
          />
        )}
      </FormField>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <FormField label="開始日" error={errors.start}>
          {(control) => (
            <input
              {...control}
              type="date"
              value={values.start}
              onChange={(event) => setValue('start', event.target.value)}
              className={INPUT_CLASS}
            />
          )}
        </FormField>
        <FormField label="終了日" error={errors.end}>
          {(control) => (
            <input
              {...control}
              type="date"
              min={values.start || undefined}
              value={values.end}
              onChange={(event) => setValue('end', event.target.value)}
              className={INPUT_CLASS}
            />
          )}
        </FormField>
      </div>
      {errors.form && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.form}
        </p>
      )}
      <div>
        <Button type="submit">
          <Plus aria-hidden className="size-4" />
          休止期間を追加
        </Button>
      </div>
    </form>
  );
}
