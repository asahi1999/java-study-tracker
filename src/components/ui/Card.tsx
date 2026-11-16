import { type ReactNode, useId } from 'react';

type CardProps = {
  /** カードの見出し。指定するとカード全体の名前としても使われる */
  title?: string;
  /** 見出しの右側に置く操作（ボタンやリンク） */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, action, children, className }: CardProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={['rounded-md border border-line bg-surface p-4 sm:p-5', className]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || action) && (
        <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
          {title && (
            <h2 id={titleId} className="text-sm font-bold tracking-wide text-muted">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
