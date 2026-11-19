import { Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { INPUT_CLASS, LABEL_CLASS } from '@/components/ui/field';
import { Modal } from '@/components/ui/Modal';
import { dataService } from '@/db/services/dataService';
import { useToday } from '@/hooks/useToday';
import { useTimerStore } from '@/stores/timerStore';
import { useToastStore } from '@/stores/toastStore';

/** 2段階目で入力してもらう言葉。押し間違いでは消えないようにするため */
export const RESET_CONFIRM_WORD = 'リセット';

const DELETED_ITEMS: readonly string[] = [
  '学習ログと、計測中の学習タイマー',
  'チェック・週の状態・メモ・GitHubのURL・開始日と完了日',
  '獲得したバッジ',
  'ロードマップの編集内容（初期ロードマップに戻ります）',
  '設定（学習開始日は今日になり、目標・休止期間・テーマも最初の値に戻ります）',
];

/** 全データのリセット。何が消えるかの確認と、確認の言葉の入力の2段階で確かめる */
export function ResetAllData() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'closed' | 'explain' | 'confirm'>('closed');
  const [typed, setTyped] = useState('');
  const [running, setRunning] = useState(false);
  const today = useToday();
  const resetTimer = useTimerStore((state) => state.reset);
  const showToast = useToastStore((state) => state.show);

  // 2段階目に進んだら、押した「リセットに進む」ボタンは消えるので、入力欄にフォーカスを移す
  useEffect(() => {
    if (step === 'confirm') inputRef.current?.focus();
  }, [step]);

  const close = () => {
    setStep('closed');
    setTyped('');
  };

  const handleReset = async () => {
    setRunning(true);
    try {
      await dataService.resetAll(today);
      // 計測中の時間も「データ」なので、一緒に消す（localStorage に置いている）
      resetTimer();
      showToast({ title: 'すべてのデータをリセットしました', icon: Trash2 });
      close();
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card title="全データのリセット">
      <p className="text-sm leading-relaxed">
        すべてのデータを消して、初めて開いたときの状態に戻します。
      </p>
      <Button variant="danger" className="mt-4" onClick={() => setStep('explain')}>
        <Trash2 aria-hidden className="size-4" />
        すべてのデータをリセット
      </Button>

      {/* 1つのダイアログの中身を段階で切り替える。ダイアログを2つにすると、
          1つ目を閉じたときの close イベントで2つ目まで閉じてしまうため */}
      <Modal
        open={step !== 'closed'}
        onClose={close}
        title={step === 'confirm' ? '最後の確認' : 'すべてのデータをリセットしますか？'}
        footer={
          step === 'confirm' ? (
            <>
              <Button onClick={close}>キャンセル</Button>
              <Button
                variant="danger"
                disabled={typed.trim() !== RESET_CONFIRM_WORD || running}
                onClick={() => void handleReset()}
              >
                すべて消す
              </Button>
            </>
          ) : (
            <>
              <Button onClick={close}>キャンセル</Button>
              <Button variant="danger" onClick={() => setStep('confirm')}>
                リセットに進む
              </Button>
            </>
          )
        }
      >
        {step === 'confirm' ? (
          <div className="grid gap-3 text-sm leading-relaxed">
            <p>
              消したデータは元に戻せません。続けるには「{RESET_CONFIRM_WORD}」と入力してください。
            </p>
            <div>
              <label htmlFor={inputId} className={LABEL_CLASS}>
                確認の言葉
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                autoComplete="off"
                placeholder={RESET_CONFIRM_WORD}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-2 text-sm leading-relaxed">
            <p>次のデータがすべて消えます。</p>
            <ul className="list-disc pl-5">
              {DELETED_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-muted">
              残しておきたい場合は、先に「データのエクスポート」でファイルに保存してください。
            </p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
