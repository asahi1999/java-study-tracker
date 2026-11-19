import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { MoveDirection } from '@/lib/reorder';

/** 直前に動かした要素。並びが変わったあと、同じボタンにフォーカスを戻すために覚えておく */
export type PendingMove = {
  id: string;
  direction: MoveDirection;
  /** 動かす前の位置。位置が変わったら（＝並びが反映されたら）フォーカスを戻す */
  fromPosition: number;
};

type MoveButtonsProps = {
  /** 動かすものの名前（読み上げ用）。例：「1週目 数当てゲーム」 */
  label: string;
  /** 一覧の中での今の位置（0始まり） */
  position: number;
  count: number;
  onMove: (direction: MoveDirection) => void;
  /** この要素を直前に動かしたときだけ渡す */
  pending?: PendingMove | null;
  onFocused: () => void;
  /** vertical は上下に積む（週の一覧）、horizontal は横に並べる（チェック項目） */
  orientation?: 'vertical' | 'horizontal';
};

const BUTTON_CLASS =
  'grid size-8 place-items-center rounded text-ink transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

/** 上下ボタンで1つずつ並びを変える。キーボードでも続けて動かせるよう、動かした後もフォーカスを保つ */
export function MoveButtons({
  label,
  position,
  count,
  onMove,
  pending,
  onFocused,
  orientation = 'horizontal',
}: MoveButtonsProps) {
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const canMoveUp = position > 0;
  const canMoveDown = position < count - 1;

  // 並びが変わると、React が要素を移動させるときにフォーカスが外れることがある。
  // 位置が変わったのを見届けてから、押したボタン（端に着いて押せなければ反対のボタン）に戻す
  useEffect(() => {
    if (!pending || position === pending.fromPosition) return;
    const [preferred, fallback] = pending.direction === 'up' ? [upRef, downRef] : [downRef, upRef];
    const target = preferred.current && !preferred.current.disabled ? preferred : fallback;
    target.current?.focus();
    onFocused();
  }, [pending, position, onFocused]);

  return (
    <div className={`flex shrink-0 gap-0.5 ${orientation === 'vertical' ? 'flex-col' : ''}`}>
      <button
        ref={upRef}
        type="button"
        aria-label={`${label}を上へ`}
        disabled={!canMoveUp}
        onClick={() => onMove('up')}
        className={BUTTON_CLASS}
      >
        <ChevronUp aria-hidden className="size-4" />
      </button>
      <button
        ref={downRef}
        type="button"
        aria-label={`${label}を下へ`}
        disabled={!canMoveDown}
        onClick={() => onMove('down')}
        className={BUTTON_CLASS}
      >
        <ChevronDown aria-hidden className="size-4" />
      </button>
    </div>
  );
}
