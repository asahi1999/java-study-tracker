import type { z } from 'zod';

import { INPUT_CLASS } from '@/components/ui/field';
import { FormField } from '@/components/ui/FormField';
import { weekRepository } from '@/db/repositories';
import { roadmapService } from '@/db/services/roadmapService';
import { WEEK_TITLE_MAX, weekInputSchema } from '@/lib/editorValidation';
import { formatStepNumber } from '@/lib/format';
import type { Month, Step, Week } from '@/types';

import { FormModal } from './FormModal';

export type WeekFormValues = z.input<typeof weekInputSchema>;

/** 週を追加するときの初期値。最後の週の次の週番号・同じ月とステップにする */
export function getNewWeekValues(
  weeks: readonly Week[],
  months: readonly Month[],
  steps: readonly Step[],
): WeekFormValues {
  const last = weeks.at(-1);
  const nextNumber = String(Math.min(52, Math.max(0, ...weeks.map((week) => week.weekEnd)) + 1));
  return {
    title: '',
    monthId: last?.monthId ?? months[0]?.id ?? '',
    stepId: last?.stepId ?? steps[0]?.id ?? '',
    weekStart: nextNumber,
    weekEnd: nextNumber,
    plannedHours: '9',
  };
}

function toFormValues(week: Week): WeekFormValues {
  return {
    title: week.title,
    monthId: week.monthId,
    stepId: week.stepId,
    weekStart: String(week.weekStart),
    weekEnd: String(week.weekEnd),
    plannedHours: String(week.plannedHours),
  };
}

type WeekFormModalProps = {
  open: boolean;
  onClose: () => void;
  months: readonly Month[];
  steps: readonly Step[];
  /** 編集する週。指定しなければ新しく追加する */
  week?: Week;
  /** 追加するときの初期値 */
  newValues: WeekFormValues;
};

/** 週を追加・編集するダイアログ。進捗（チェック・メモなど）は週の詳細で記録するので、ここでは扱わない */
export function WeekFormModal({
  open,
  onClose,
  months,
  steps,
  week,
  newValues,
}: WeekFormModalProps) {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={week ? '週を編集' : '週を追加'}
      submitLabel={week ? '変更を保存' : '週を追加'}
      schema={weekInputSchema}
      initialValues={week ? toFormValues(week) : newValues}
      onSubmit={(data) =>
        week ? weekRepository.update(week.id, data) : roadmapService.addWeek(data)
      }
    >
      {({ values, errors, setValue }) => (
        <>
          <FormField label="作るもの" error={errors.title}>
            {(control) => (
              <input
                {...control}
                type="text"
                maxLength={WEEK_TITLE_MAX}
                placeholder="例：電卓アプリ"
                value={values.title}
                onChange={(event) => setValue('title', event.target.value)}
                className={INPUT_CLASS}
              />
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="月" error={errors.monthId}>
              {(control) => (
                <select
                  {...control}
                  value={values.monthId}
                  onChange={(event) => setValue('monthId', event.target.value)}
                  className={INPUT_CLASS}
                >
                  {months.map((month) => (
                    <option key={month.id} value={month.id}>
                      {month.title}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="ステップ" error={errors.stepId}>
              {(control) => (
                <select
                  {...control}
                  value={values.stepId}
                  onChange={(event) => setValue('stepId', event.target.value)}
                  className={INPUT_CLASS}
                >
                  {steps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {formatStepNumber(step.order)} {step.title}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="開始の週" error={errors.weekStart}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.weekStart}
                  onChange={(event) => setValue('weekStart', event.target.value)}
                  className={INPUT_CLASS}
                />
              )}
            </FormField>
            <FormField label="終了の週" error={errors.weekEnd}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.weekEnd}
                  onChange={(event) => setValue('weekEnd', event.target.value)}
                  className={INPUT_CLASS}
                />
              )}
            </FormField>
            <FormField label="予定時間（時間）" error={errors.plannedHours}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={values.plannedHours}
                  onChange={(event) => setValue('plannedHours', event.target.value)}
                  className={INPUT_CLASS}
                />
              )}
            </FormField>
          </div>
          <p className="-mt-2 text-[12px] leading-relaxed text-muted">
            週番号から予定日を計算します。2週にまたがる週は「開始の週」と「終了の週」を変えてください。
          </p>
        </>
      )}
    </FormModal>
  );
}
