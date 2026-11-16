import { ExternalLink } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ERROR_CLASS, INPUT_CLASS, LABEL_CLASS } from '@/components/ui/field';
import { weekRepository } from '@/db/repositories';
import { createWeekDatesSchema, getFieldErrors, repoUrlSchema } from '@/lib/validation';
import type { Week } from '@/types';

type DateField = 'startedAt' | 'completedAt';

type WeekRecordFormProps = {
  week: Week;
  today: string;
};

/** 実際の開始日・完了日と、GitHubリポジトリのURLを記録するフォーム */
export function WeekRecordForm({ week, today }: WeekRecordFormProps) {
  return (
    <Card title="記録">
      <div className="grid gap-4">
        <DateInput week={week} field="startedAt" label="開始日" today={today} />
        {/* 完了日は「完成にする」を押したときに入る。完成した後で、実際の日付に直せるようにしている */}
        {week.status === 'done' && (
          <DateInput week={week} field="completedAt" label="完了日" today={today} />
        )}
        <RepoUrlInput week={week} />
      </div>
    </Card>
  );
}

type DateInputProps = {
  week: Week;
  field: DateField;
  label: string;
  today: string;
};

function DateInput({ week, field, label, today }: DateInputProps) {
  const inputId = useId();
  const errorId = useId();
  // 入力チェックに通らなかった値だけを手元に持つ。通った値はすぐ保存し、保存済みの値を表示する
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    const input = {
      startedAt: week.startedAt ?? '',
      completedAt: week.completedAt ?? '',
      [field]: value,
    };
    const result = createWeekDatesSchema({ today, isDone: week.status === 'done' }).safeParse(
      input,
    );

    if (!result.success) {
      setDraft(value);
      setError(Object.values(getFieldErrors(result.error))[0] ?? '日付を正しく入力してください');
      return;
    }

    setDraft(null);
    setError(null);
    void weekRepository.update(week.id, { [field]: value === '' ? null : value });
  };

  return (
    <div>
      <label htmlFor={inputId} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        max={today}
        value={draft ?? week[field] ?? ''}
        onChange={(event) => handleChange(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className={INPUT_CLASS}
      />
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}

function RepoUrlInput({ week }: { week: Week }) {
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (draft === null) return;

    const result = repoUrlSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'URLを正しく入力してください');
      return;
    }

    setDraft(null);
    setError(null);
    if (result.data !== week.repoUrl) {
      void weekRepository.update(week.id, { repoUrl: result.data });
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className={LABEL_CLASS}>
        GitHubリポジトリのURL
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://github.com/ユーザー名/リポジトリ名"
          value={draft ?? week.repoUrl}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          // 保存ボタンを押さずにほかの場所へ移っても、入力した内容を失わないようにする
          onBlur={save}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className={`${INPUT_CLASS} min-w-0 flex-1`}
        />
        <Button type="submit" className="mt-1 shrink-0">
          保存
        </Button>
      </div>
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
      {week.repoUrl && (
        <a
          href={week.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold underline underline-offset-2"
        >
          <ExternalLink aria-hidden className="size-3.5" />
          GitHubで開く
        </a>
      )}
    </form>
  );
}
