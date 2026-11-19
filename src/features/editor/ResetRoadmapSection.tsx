import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { roadmapService } from '@/db/services/roadmapService';
import type { RoadmapResetMode } from '@/lib/roadmapReset';
import { useToastStore } from '@/stores/toastStore';

const MODE_OPTIONS: readonly { mode: RoadmapResetMode; label: string; description: string }[] = [
  {
    mode: 'keep',
    label: '進捗と学習ログを残す',
    description:
      '初期データと同じ週・項目の状態、チェック、URL、メモ、日付を引き継ぎます。追加した週と項目は消え、その週の学習ログは「週の指定なし」になります。バッジは残ります。',
  },
  {
    mode: 'erase',
    label: 'すべて消して最初からにする',
    description: '進捗に加えて、学習ログとバッジも削除します。',
  },
];

// 選択肢の見た目はテーマの設定と同じ。ラジオボタンの状態（:checked / :focus-visible）から決める
const OPTION_CLASS =
  'flex cursor-pointer gap-3 rounded border-[1.5px] border-line p-3 transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink/5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--focus))]';

/** 「初期ロードマップに戻す」。進捗を残すか消すかを選んでから実行する（Q14） */
export function ResetRoadmapSection() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RoadmapResetMode>('keep');
  const [running, setRunning] = useState(false);
  const showToast = useToastStore((state) => state.show);

  const close = () => {
    setOpen(false);
    // 次に開いたときは、取り消しやすいほう（残す）から始める
    setMode('keep');
  };

  const handleReset = async () => {
    setRunning(true);
    try {
      await roadmapService.resetToInitial(mode);
      showToast({ title: '初期ロードマップに戻しました', icon: RotateCcw });
      close();
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card title="初期ロードマップに戻す">
      <p className="text-sm leading-relaxed">
        月・ステップ・週・チェック項目を、最初に入っていた内容に戻します。設定（開始日・目標・休止期間・テーマ）は変わりません。
      </p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        <RotateCcw aria-hidden className="size-4" />
        初期ロードマップに戻す
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="初期ロードマップに戻しますか？"
        footer={
          <>
            <Button onClick={close}>キャンセル</Button>
            <Button variant="danger" disabled={running} onClick={() => void handleReset()}>
              初期ロードマップに戻す
            </Button>
          </>
        }
      >
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm leading-relaxed">
            名前や予定（週番号・予定時間）は、初期データに戻ります。進捗をどうするか選んでください。
          </legend>
          {MODE_OPTIONS.map((option) => (
            <label key={option.mode} className={OPTION_CLASS}>
              <input
                type="radio"
                name="reset-mode"
                value={option.mode}
                checked={mode === option.mode}
                onChange={() => setMode(option.mode)}
                className="mt-1 size-4 shrink-0 accent-[rgb(var(--ink))]"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-bold">{option.label}</span>
                <span className="text-[13px] leading-relaxed text-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="mt-3 text-[13px] text-muted">実行すると元に戻せません。</p>
      </Modal>
    </Card>
  );
}
