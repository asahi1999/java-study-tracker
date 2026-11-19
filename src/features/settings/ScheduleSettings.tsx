import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { INPUT_CLASS } from '@/components/ui/field';
import { FormField } from '@/components/ui/FormField';
import { settingsRepository } from '@/db/repositories';
import { scheduleSettingsSchema } from '@/lib/settingsValidation';
import { getFieldErrors } from '@/lib/validation';
import type { Settings } from '@/types';

type ScheduleValues = { startDate: string; weeklyGoalHours: string; dailyGoalMinutes: string };

function toValues(settings: Settings): ScheduleValues {
  return {
    startDate: settings.startDate,
    weeklyGoalHours: String(settings.weeklyGoalHours),
    dailyGoalMinutes: String(settings.dailyGoalMinutes),
  };
}

/**
 * 学習開始日と目標時間。「保存」を押したときだけ保存する。
 * 開始日は日付の入力中にも値が変わるので、その都度保存すると、途中の日付で予定やバッジの判定が動いてしまうため
 */
export function ScheduleSettings({ settings }: { settings: Settings }) {
  const [saved, setSaved] = useState(false);
  const savedValues = toValues(settings);

  return (
    <Card title="学習の予定と目標">
      {/* インポートやリセットで保存済みの値が変わったら、入力欄も作り直して新しい値にそろえる */}
      <ScheduleForm
        key={Object.values(savedValues).join('|')}
        initialValues={savedValues}
        saved={saved}
        onSaved={() => setSaved(true)}
        onEdit={() => setSaved(false)}
      />
    </Card>
  );
}

type ScheduleFormProps = {
  initialValues: ScheduleValues;
  /** 保存した直後か。「保存しました」を出す */
  saved: boolean;
  onSaved: () => void;
  onEdit: () => void;
};

function ScheduleForm({ initialValues, saved, onSaved, onEdit }: ScheduleFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = (key: keyof ScheduleValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    onEdit();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = scheduleSettingsSchema.safeParse(values);
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }
    setErrors({});
    await settingsRepository.update(result.data);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField
        label="学習開始日"
        hint="変更すると、すべての週の予定日が計算し直されます。"
        error={errors.startDate}
      >
        {(control) => (
          <input
            {...control}
            type="date"
            value={values.startDate}
            onChange={(event) => setValue('startDate', event.target.value)}
            className={`${INPUT_CLASS} sm:max-w-60`}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="週の目標（時間）" error={errors.weeklyGoalHours}>
          {(control) => (
            <input
              {...control}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values.weeklyGoalHours}
              onChange={(event) => setValue('weeklyGoalHours', event.target.value)}
              className={INPUT_CLASS}
            />
          )}
        </FormField>
        <FormField label="1日の目標（分）" error={errors.dailyGoalMinutes}>
          {(control) => (
            <input
              {...control}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={values.dailyGoalMinutes}
              onChange={(event) => setValue('dailyGoalMinutes', event.target.value)}
              className={INPUT_CLASS}
            />
          )}
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary">
          保存
        </Button>
        <p role="status" className="text-[13px] text-status-green-fg">
          {saved ? '保存しました' : ''}
        </p>
      </div>
    </form>
  );
}
