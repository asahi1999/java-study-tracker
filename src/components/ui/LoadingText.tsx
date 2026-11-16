/** 画面の一部を読み込んでいる間の表示 */
export function LoadingText() {
  return (
    <p role="status" className="py-6 text-sm text-muted">
      読み込み中…
    </p>
  );
}
