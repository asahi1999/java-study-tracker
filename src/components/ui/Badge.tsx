import type { ReactNode } from 'react';

export type BadgeTone = 'gray' | 'blue' | 'green' | 'red';

const TONES: Record<BadgeTone, string> = {
  gray: 'bg-status-gray-bg text-status-gray-fg',
  blue: 'bg-status-blue-bg text-status-blue-fg',
  green: 'bg-status-green-bg text-status-green-fg',
  red: 'bg-status-red-bg text-status-red-fg',
};

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
};

/** 状態を示す小さなラベル。色だけに頼らず、必ず文字で状態を書く */
export function Badge({ tone = 'gray', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
