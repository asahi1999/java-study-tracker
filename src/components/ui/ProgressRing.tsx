import type { ReactNode } from 'react';

type ProgressRingProps = {
  /** 進み具合（0〜100）。範囲外の値は 0〜100 に丸める */
  value: number;
  /** 何の進捗かを読み上げるための名前（例：「全体の進捗」） */
  label: string;
  /** 輪の中に表示する内容 */
  children?: ReactNode;
  className?: string;
};

// 輪の太さと半径（viewBox 120 の中での値）。駅ナンバリングの記号のように、太い輪にしている
const STROKE = 13;
const RADIUS = (120 - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function toPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** 輪の形の進捗表示。大きさは className（size-32 など）で決める */
export function ProgressRing({ value, label, children, className }: ProgressRingProps) {
  const percent = toPercent(value);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={['relative shrink-0', className].filter(Boolean).join(' ')}
    >
      {/* 12時の位置から時計回りに進むように、全体を90度回している */}
      <svg aria-hidden viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-subtle"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
          className="stroke-progress transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}
