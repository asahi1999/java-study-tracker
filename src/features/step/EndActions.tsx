// 「次のステップへ」と「ここで終える」（同じ大きさで横に並べる。F-HOME-2、05-visual-design.md 7-1）
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { buttonClass } from '@/components/game/buttonStyles';
import type { StepSummary } from '@/content/schema';

type Props = { next: StepSummary | null; autoFocus?: boolean };

export function EndActions({ next, autoFocus = false }: Props) {
  const nextRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (autoFocus) nextRef.current?.focus();
  }, [autoFocus]);
  return (
    <div className="grid grid-cols-2 gap-3">
      {next ? (
        <Link
          ref={nextRef}
          to={`/step/${next.id}`}
          className={buttonClass('primary', 'md', 'w-full whitespace-nowrap !px-2')}
        >
          次のステップへ（約{next.minutes}分）
        </Link>
      ) : (
        <p className="self-center text-sm text-ink-dim">公開中のステップは全部終わりました</p>
      )}
      <Link to="/" className={buttonClass('secondary', 'md', 'w-full whitespace-nowrap !px-2')}>
        ここで終える
      </Link>
    </div>
  );
}
