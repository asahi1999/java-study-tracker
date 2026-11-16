import { useId, useState } from 'react';

import { Card } from '@/components/ui/Card';
import { weekRepository } from '@/db/repositories';
import { type SaveStatus, useAutoSave } from '@/hooks/useAutoSave';
import type { Week } from '@/types';

import { MarkdownPreview } from './MarkdownPreview';

type MemoMode = 'edit' | 'preview';

const MODES: readonly { mode: MemoMode; label: string }[] = [
  { mode: 'edit', label: '編集' },
  { mode: 'preview', label: 'プレビュー' },
];

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  idle: '',
  pending: '保存中…',
  saved: '保存しました',
  error: '保存できませんでした',
};

/**
 * 週のメモ。Markdown で書き、入力が止まると自動で保存する。
 * 別の週に切り替えるときは key を変えて作り直すこと（入力中の内容を前の週のまま持ち越さないため）
 */
export function MemoEditor({ week }: { week: Week }) {
  const textareaId = useId();
  const hintId = useId();
  const [text, setText] = useState(week.memo);
  const [mode, setMode] = useState<MemoMode>('edit');
  const { status, schedule } = useAutoSave<string>((memo) =>
    weekRepository.update(week.id, { memo }),
  );

  const handleChange = (value: string) => {
    setText(value);
    schedule(value);
  };

  return (
    <Card
      title="メモ"
      action={
        <p
          role="status"
          className={`text-[13px] leading-none ${status === 'error' ? 'text-status-red-fg' : 'text-muted'}`}
        >
          {SAVE_STATUS_LABELS[status]}
        </p>
      }
    >
      <div
        role="group"
        aria-label="メモの表示"
        className="mb-3 inline-flex rounded border-[1.5px] border-ink p-0.5"
      >
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            aria-pressed={mode === option.mode}
            onClick={() => setMode(option.mode)}
            className={`rounded-sm px-3 py-1.5 text-sm leading-none transition-colors ${
              mode === option.mode ? 'bg-ink font-bold text-surface' : 'text-ink hover:bg-ink/5'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'edit' ? (
        <>
          <label htmlFor={textareaId} className="sr-only">
            メモ
          </label>
          <textarea
            id={textareaId}
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            rows={8}
            aria-describedby={hintId}
            placeholder="つまずいた点、調べたこと、次にやることなど"
            className="block w-full resize-y rounded border-[1.5px] border-line bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-muted/70"
          />
          <p id={hintId} className="mt-2 text-[13px] leading-relaxed text-muted">
            Markdown で書けます。入力が止まると自動で保存します。
          </p>
        </>
      ) : (
        <div className="min-h-32 rounded border-[1.5px] border-line px-3 py-2.5">
          <MarkdownPreview source={text} />
        </div>
      )}
    </Card>
  );
}
