import type { ReactNode } from 'react';

/** グラフにカーソルを合わせたときに出す吹き出しの枠 */
export function ChartTooltip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border border-line bg-surface px-3 py-2 text-[13px] leading-relaxed shadow-lg">
      <p className="font-bold">{title}</p>
      {children}
    </div>
  );
}
