import { Copy, Download, FileJson } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ERROR_CLASS, LABEL_CLASS, TEXTAREA_CLASS } from '@/components/ui/field';
import { dataService } from '@/db/services/dataService';
import { getBackupFileName, stringifyBackup } from '@/lib/backup';
import { todayString } from '@/lib/date';

type Exported = { text: string; fileName: string };

/** JSONの文字列をファイルとして保存させる */
function downloadText({ text, fileName }: Exported): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // クリックの処理が終わる前に URL を消すと、保存されないブラウザがあるので少し待つ
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** 全データを1つのJSONにして表示する。コピーとファイルへの保存ができる */
export function ExportData() {
  const textareaId = useId();
  const [exported, setExported] = useState<Exported | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleExport = async () => {
    try {
      const backup = await dataService.exportAll();
      setExported({ text: stringifyBackup(backup), fileName: getBackupFileName(todayString()) });
      setMessage('');
      setError('');
    } catch {
      setError(
        'エクスポートできませんでした。ページを再読み込みしてから、もう一度試してください。',
      );
    }
  };

  const handleCopy = async () => {
    if (!exported) return;
    try {
      await navigator.clipboard.writeText(exported.text);
      setMessage('コピーしました');
    } catch {
      // クリップボードを使えない環境（権限がない・古いブラウザ）では、手で選んでコピーしてもらう
      setMessage('コピーできませんでした。下の欄の文字をすべて選んでコピーしてください。');
    }
  };

  const handleDownload = () => {
    if (!exported) return;
    downloadText(exported);
    setMessage(`${exported.fileName} の保存を始めました`);
  };

  return (
    <Card title="データのエクスポート">
      <p className="text-sm leading-relaxed">
        すべてのデータを1つのJSONにします。ほかのブラウザやスマホへ移すときや、バックアップに使えます。
      </p>
      <Button className="mt-4" onClick={() => void handleExport()}>
        <FileJson aria-hidden className="size-4" />
        {exported ? 'JSONを作り直す' : 'JSONを作る'}
      </Button>
      {error && (
        <p role="alert" className={ERROR_CLASS}>
          {error}
        </p>
      )}

      {exported && (
        <div className="mt-4 grid gap-3">
          <div>
            <label htmlFor={textareaId} className={LABEL_CLASS}>
              エクスポートしたJSON（{exported.fileName}）
            </label>
            <textarea
              id={textareaId}
              readOnly
              rows={10}
              value={exported.text}
              onFocus={(event) => event.target.select()}
              className={`${TEXTAREA_CLASS} font-mono text-[12px] leading-snug`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void handleCopy()}>
              <Copy aria-hidden className="size-4" />
              コピー
            </Button>
            <Button onClick={handleDownload}>
              <Download aria-hidden className="size-4" />
              ダウンロード
            </Button>
            <p role="status" className="self-center text-[13px]">
              {message}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
