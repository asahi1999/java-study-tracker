// Java 実行環境の状態（F-HOME-4）。右下に小さく
import type { RunnerStatus } from '@/runtime/java/JavaRunner';

export function javaStatusText(status: RunnerStatus, progress: number): string {
  switch (status) {
    case 'idle':
      return 'Java: 準備前';
    case 'downloading':
      return `Java: 準備中 ${Math.round(progress * 100)}%`;
    case 'ready':
      return 'Java: 準備完了';
    case 'unsupported':
      return 'Java: このブラウザでは動きません';
    case 'failed':
      return 'Java: 準備できませんでした（実行するともう一度試します）';
  }
}

export function JavaStatusChip({ status, progress }: { status: RunnerStatus; progress: number }) {
  const dot =
    status === 'ready'
      ? 'bg-moss'
      : status === 'unsupported' || status === 'failed'
        ? 'bg-ink-faint'
        : 'bg-torch';
  return (
    <p role="status" className="flex items-center justify-end gap-2 text-xs text-ink-faint">
      <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 ${dot}`} />
      {javaStatusText(status, progress)}
    </p>
  );
}
