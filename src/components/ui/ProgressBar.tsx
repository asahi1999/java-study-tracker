type ProgressBarProps = {
  /** 進み具合（0〜100）。範囲外の値は 0〜100 に丸める */
  value: number;
  /** 何の進捗かを読み上げるための名前（例：「1ヶ月目の進捗」） */
  label: string;
  className?: string;
};

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const percent = toPercent(value);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={['h-2 overflow-hidden rounded-full bg-subtle', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="h-full rounded-full bg-progress transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
