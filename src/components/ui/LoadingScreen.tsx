import { BrandMark } from '@/components/layout/BrandMark';

/** 起動時の準備（初期データの確認）が終わるまで表示する画面 */
export function LoadingScreen() {
  return (
    <div
      role="status"
      className="on-board grid min-h-dvh place-items-center bg-board text-board-ink"
    >
      <div className="flex flex-col items-center gap-4">
        <BrandMark />
        <p className="text-sm text-board-muted">読み込み中…</p>
      </div>
    </div>
  );
}
