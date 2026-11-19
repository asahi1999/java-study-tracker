import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button, buttonClassName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { dataService } from '@/db/services/dataService';
import { type BackupFile, summarizeBackup } from '@/lib/backup';
import { formatDateTime, formatFullDate, formatMinutes } from '@/lib/format';
import { useToastStore } from '@/stores/toastStore';

/** エラーを並べる上限。多すぎると読めないので、残りは件数だけ出す */
const MAX_SHOWN_ERRORS = 10;

type PendingImport = { backup: BackupFile; fileName: string };

/** JSONファイルを読み込み、検証して内容を見せてから、全データを置き換える */
export function ImportData() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importing, setImporting] = useState(false);
  const showToast = useToastStore((state) => state.show);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    // 同じファイルを選び直しても読み込めるよう、選択を空に戻す
    if (inputRef.current) inputRef.current.value = '';

    const result = dataService.validateImport(await file.text());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setPending({ backup: result.backup, fileName: file.name });
  };

  const handleImport = async () => {
    if (!pending) return;
    setImporting(true);
    try {
      await dataService.importAll(pending.backup.data);
      showToast({ title: 'データをインポートしました', icon: Upload });
    } catch {
      setErrors([
        '書き込みの途中で失敗しました。データは変更していません。もう一度試してください。',
      ]);
    } finally {
      setImporting(false);
      setPending(null);
    }
  };

  return (
    <Card title="データのインポート">
      <p className="text-sm leading-relaxed">
        エクスポートしたJSONファイルを読み込み、今のデータをすべて置き換えます。読み込む前に、中身を確認できます。
      </p>
      {/* ファイル選択の入力欄は見えなくして、ボタンの見た目のラベルを押して選ぶ */}
      <label
        className={buttonClassName({
          className:
            'mt-4 cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--focus))]',
        })}
      >
        <Upload aria-hidden className="size-4" />
        JSONファイルを選ぶ
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          className="sr-only"
        />
      </label>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded border border-status-red/40 bg-status-red-bg p-3 text-[13px] leading-relaxed"
        >
          <p className="font-bold text-status-red-fg">
            読み込めませんでした。データは変更していません。
          </p>
          <ul className="mt-1 list-disc pl-5">
            {errors.slice(0, MAX_SHOWN_ERRORS).map((error, index) => (
              <li key={index} className="break-all">
                {error}
              </li>
            ))}
          </ul>
          {errors.length > MAX_SHOWN_ERRORS && (
            <p className="mt-1">ほかに{errors.length - MAX_SHOWN_ERRORS}件あります。</p>
          )}
        </div>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="この内容でインポートしますか？"
        footer={
          <>
            <Button onClick={() => setPending(null)}>キャンセル</Button>
            <Button variant="danger" disabled={importing} onClick={() => void handleImport()}>
              すべて置き換える
            </Button>
          </>
        }
      >
        {pending && <ImportSummary {...pending} />}
      </Modal>
    </Card>
  );
}

function ImportSummary({ backup, fileName }: PendingImport) {
  const summary = summarizeBackup(backup);
  const rows: readonly [string, string][] = [
    ['エクスポートした日時', formatDateTime(summary.exportedAt)],
    ['学習開始日', formatFullDate(summary.startDate)],
    [
      'ロードマップ',
      `月${summary.months}件・ステップ${summary.steps}件・週${summary.weeks}件・チェック項目${summary.skills}件`,
    ],
    ['学習ログ', `${summary.logs}件（合計${formatMinutes(summary.totalMinutes)}）`],
    ['バッジ', `${summary.badges}個`],
  ];

  return (
    <div className="grid gap-3 text-sm leading-relaxed">
      <p className="break-all font-bold">{fileName}</p>
      <dl className="grid gap-1.5 rounded border border-line p-3">
        {rows.map(([term, detail]) => (
          <div key={term} className="grid gap-x-3 sm:grid-cols-[9rem_1fr]">
            <dt className="text-[13px] text-muted">{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>
      <p>
        今のデータ（学習ログ・進捗・バッジ・設定）はすべて消え、このファイルの内容に置き換わります。元に戻せないので、今のデータを残したい場合は、先にエクスポートしてください。
      </p>
    </div>
  );
}
