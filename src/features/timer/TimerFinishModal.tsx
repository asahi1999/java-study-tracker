import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ERROR_CLASS, LABEL_CLASS, TEXTAREA_CLASS } from '@/components/ui/field';
import { Modal } from '@/components/ui/Modal';
import { logService } from '@/db/services/logService';
import { WeekSelect } from '@/features/logs/WeekSelect';
import { formatDateWithWeekday, formatMinutes } from '@/lib/format';
import { getElapsedMs, getTimerLogDate, MAX_LOG_MINUTES, toLogMinutes } from '@/lib/timer';
import { LOG_CONTENT_MAX_LENGTH } from '@/lib/validation';
import { useTimerStore } from '@/stores/timerStore';
import type { Week } from '@/types';

type TimerFinishModalProps = {
  open: boolean;
  onClose: () => void;
  weeks: readonly Week[];
  today: string;
};

/**
 * タイマーを終了するときのダイアログ。やったことを入力して、学習ログとして保存する。
 * 開く前にタイマーを一時停止しておくこと（入力している間に時間が進まないようにするため）
 */
export function TimerFinishModal({ open, onClose, weeks, today }: TimerFinishModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="学習を記録">
      <FinishForm onClose={onClose} weeks={weeks} today={today} />
    </Modal>
  );
}

function FinishForm({ onClose, weeks, today }: Omit<TimerFinishModalProps, 'open'>) {
  const id = useId();
  const timer = useTimerStore();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 一時停止中なので、経過時間は現在時刻によらず決まる
  const { minutes, capped } = toLogMinutes(getElapsedMs(timer, 0));
  const date = getTimerLogDate(timer, today);
  // 計測中に週が削除されていたら、「週の指定なし」として扱う
  const weekId = weeks.some((week) => week.id === timer.weekId) ? timer.weekId : null;

  if (minutes < 1) {
    return (
      <>
        <p className="text-sm leading-relaxed">
          計測した時間が1分に満たないので、学習ログには保存できません。
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="danger"
            onClick={() => {
              timer.reset();
              onClose();
            }}
          >
            計測を破棄
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              timer.resume();
              onClose();
            }}
          >
            計測を続ける
          </Button>
        </div>
      </>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await logService.add(
        { date, minutes, weekId, content: content.trim(), source: 'timer' },
        today,
      );
      timer.reset();
      onClose();
    } catch {
      setError('保存できませんでした。もう一度試してください。');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 rounded bg-subtle/60 p-3">
        <div>
          <dt className="text-[13px] text-muted">学習時間</dt>
          <dd className="mt-0.5 text-lg font-bold leading-tight">{formatMinutes(minutes)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">学習した日</dt>
          <dd className="mt-0.5 text-lg font-bold leading-tight">{formatDateWithWeekday(date)}</dd>
        </div>
      </dl>

      {capped && (
        <p className="rounded border border-status-red bg-status-red-bg p-3 text-[13px] leading-relaxed">
          計測が24時間を超えました。1件の学習ログに記録できるのは24時間までなので、
          {formatMinutes(MAX_LOG_MINUTES)}（{MAX_LOG_MINUTES}分）として保存します。
        </p>
      )}

      <div>
        <label htmlFor={`${id}-week`} className={LABEL_CLASS}>
          週
        </label>
        <WeekSelect
          id={`${id}-week`}
          value={weekId ?? ''}
          onChange={(value) => timer.setWeekId(value === '' ? null : value)}
          weeks={weeks}
        />
      </div>

      <div>
        <label htmlFor={`${id}-content`} className={LABEL_CLASS}>
          やったこと
        </label>
        <textarea
          id={`${id}-content`}
          rows={3}
          maxLength={LOG_CONTENT_MAX_LENGTH}
          placeholder="例：for文の練習問題を解いた"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className={TEXTAREA_CLASS}
        />
      </div>

      {error && (
        <p role="alert" className={ERROR_CLASS}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>キャンセル</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          ログを保存
        </Button>
      </div>
    </form>
  );
}
