import type { ReactNode } from 'react';

// チップ（05-visual-design.md 7-2）。所要時間だけ松明色
type Props = { tone?: 'plain' | 'torch' | 'moss'; children: ReactNode };

const TONES = {
  plain: 'bg-panel-2 text-ink-dim',
  torch: 'bg-torch/15 text-torch-text',
  moss: 'bg-moss/15 text-moss',
};

export function Chip({ tone = 'plain', children }: Props) {
  return (
    <span
      className={`notch-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs leading-none ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
