// 駅ナンバリングの記号（路線記号を四角で囲んだもの）を手本にしたロゴ。
// 「JS」は Java Study の頭文字。濃紺の板の上に置く前提の配色にしている
export function BrandMark() {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-md border-[3px] border-accent font-num text-[15px] font-bold leading-none tracking-wide text-board-ink"
    >
      JS
    </span>
  );
}
