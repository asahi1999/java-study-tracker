import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ERROR_CLASS, INPUT_CLASS, LABEL_CLASS, TEXTAREA_CLASS } from '@/components/ui/field';
import { Modal } from '@/components/ui/Modal';
import { logService } from '@/db/services/logService';
import { createLogInputSchema, getFieldErrors, LOG_CONTENT_MAX_LENGTH } from '@/lib/validation';
import type { StudyLog, Week } from '@/types';

import { WeekSelect } from './WeekSelect';

type LogFormModalProps = {
  open: boolean;
  onClose: () => void;
  weeks: readonly Week[];
  today: string;
  /** 編集するログ。指定しなければ新しく追加する */
  log?: StudyLog;
  /** 追加するときの、週の初期値 */
  defaultWeekId?: string | null;
};

/** 学習ログを手動で追加・編集するダイアログ */
export function LogFormModal({ open, onClose, log, ...rest }: LogFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={log ? '学習ログを編集' : '学習ログを追加'}>
      {/* Modal は開いている間だけ中身を描画するので、開くたびに入力欄は初期値に戻る */}
      <LogForm onClose={onClose} log={log} {...rest} />
    </Modal>
  );
}

type LogFormProps = Omit<LogFormModalProps, 'open'>;

function LogForm({ onClose, weeks, today, log, defaultWeekId }: LogFormProps) {
  const id = useId();
  const [date, setDate] = useState(log?.date ?? today);
  const [minutes, setMinutes] = useState(log ? String(log.minutes) : '');
  const [weekId, setWeekId] = useState(log ? (log.weekId ?? '') : (defaultWeekId ?? ''));
  const [content, setContent] = useState(log?.content ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const result = createLogInputSchema({ today }).safeParse({ date, minutes, weekId, content });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      if (log) await logService.update(log.id, result.data, today);
      else await logService.add({ ...result.data, source: 'manual' }, today);
      onClose();
    } catch {
      setErrors({ form: '保存できませんでした。もう一度試してください。' });
      setSaving(false);
    }
  };

  const fieldProps = (name: string) => ({
    id: `${id}-${name}`,
    'aria-invalid': name in errors,
    'aria-describedby': name in errors ? `${id}-${name}-error` : undefined,
  });
  const fieldError = (name: string) =>
    errors[name] && (
      <p id={`${id}-${name}-error`} className={ERROR_CLASS}>
        {errors[name]}
      </p>
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-date`} className={LABEL_CLASS}>
            学習した日
          </label>
          <input
            {...fieldProps('date')}
            type="date"
            max={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={INPUT_CLASS}
          />
          {fieldError('date')}
        </div>
        <div>
          <label htmlFor={`${id}-minutes`} className={LABEL_CLASS}>
            学習時間（分）
          </label>
          <input
            {...fieldProps('minutes')}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="例：45"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className={INPUT_CLASS}
          />
          {fieldError('minutes')}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-week`} className={LABEL_CLASS}>
          週
        </label>
        <WeekSelect id={`${id}-week`} value={weekId} onChange={setWeekId} weeks={weeks} />
      </div>

      <div>
        <label htmlFor={`${id}-content`} className={LABEL_CLASS}>
          やったこと
        </label>
        <textarea
          {...fieldProps('content')}
          rows={3}
          maxLength={LOG_CONTENT_MAX_LENGTH}
          placeholder="例：for文の練習問題を解いた"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className={TEXTAREA_CLASS}
        />
        {fieldError('content')}
      </div>

      {errors.form && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.form}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>キャンセル</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {log ? '変更を保存' : 'ログを追加'}
        </Button>
      </div>
    </form>
  );
}
