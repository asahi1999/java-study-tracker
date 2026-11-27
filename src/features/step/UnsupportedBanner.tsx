// 非対応のブラウザの案内（02-requirements.md N-BR-2）。閉じられる
import { useState } from 'react';

export function UnsupportedBanner() {
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  if (closed) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div
      role="region"
      aria-label="このブラウザについて"
      className="flex flex-wrap items-center gap-3 border-b-2 border-line bg-panel px-4 py-2 text-sm shadow-[inset_2px_0_0_rgb(var(--torch))]"
    >
      <p className="flex-1">
        このブラウザでは Java を動かせません。Chrome で開くか、『手元で実行』を使ってください
      </p>
      <button
        type="button"
        onClick={copy}
        className="h-8 px-3 text-xs shadow-edge hover:bg-panel-2 focus-visible:shadow-focus-in focus-visible:outline-none"
      >
        {copied ? 'コピーしました' : 'URL をコピー'}
      </button>
      <button
        type="button"
        onClick={() => setClosed(true)}
        className="h-8 px-3 text-xs text-ink-dim underline focus-visible:shadow-focus-in focus-visible:outline-none"
      >
        閉じる
      </button>
    </div>
  );
}
