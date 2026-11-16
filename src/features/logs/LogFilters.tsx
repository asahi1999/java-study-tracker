import { useId } from 'react';

import { Button } from '@/components/ui/Button';
import { INPUT_CLASS, LABEL_CLASS } from '@/components/ui/field';
import { formatStepNumber } from '@/lib/format';
import { isLogFilterEmpty, type LogFilter, NO_WEEK } from '@/lib/logFilter';
import { formatWeekLabel } from '@/lib/week';
import type { Step, Week } from '@/types';

type LogFiltersProps = {
  filter: LogFilter;
  onChange: (filter: LogFilter) => void;
  onClear: () => void;
  weeks: readonly Week[];
  steps: readonly Step[];
};

/** 学習ログの絞り込み（期間・週・ステップ） */
export function LogFilters({ filter, onChange, onClear, weeks, steps }: LogFiltersProps) {
  const id = useId();
  const set = (changes: Partial<LogFilter>) => onChange({ ...filter, ...changes });

  return (
    <section aria-label="絞り込み" className="rounded-md border border-line bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <label htmlFor={`${id}-from`} className={LABEL_CLASS}>
            期間（開始）
          </label>
          <input
            id={`${id}-from`}
            type="date"
            value={filter.from}
            max={filter.to || undefined}
            onChange={(event) => set({ from: event.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`${id}-to`} className={LABEL_CLASS}>
            期間（終了）
          </label>
          <input
            id={`${id}-to`}
            type="date"
            value={filter.to}
            min={filter.from || undefined}
            onChange={(event) => set({ to: event.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`${id}-week`} className={LABEL_CLASS}>
            週
          </label>
          <select
            id={`${id}-week`}
            value={filter.weekId}
            onChange={(event) => set({ weekId: event.target.value })}
            className={INPUT_CLASS}
          >
            <option value="">すべての週</option>
            {weeks.map((week) => (
              <option key={week.id} value={week.id}>
                {formatWeekLabel(week)}
              </option>
            ))}
            <option value={NO_WEEK}>週の指定なし</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-step`} className={LABEL_CLASS}>
            ステップ
          </label>
          <select
            id={`${id}-step`}
            value={filter.stepId}
            onChange={(event) => set({ stepId: event.target.value })}
            className={INPUT_CLASS}
          >
            <option value="">すべてのステップ</option>
            {steps.map((step) => (
              <option key={step.id} value={step.id}>
                {formatStepNumber(step.order)} {step.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!isLogFilterEmpty(filter) && (
        <Button variant="ghost" size="sm" onClick={onClear} className="-mb-1 -ml-3 mt-3">
          絞り込みを解除
        </Button>
      )}
    </section>
  );
}
