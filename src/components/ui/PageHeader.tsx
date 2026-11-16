import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  /** 見出しの右側に置く操作（ボタンなど） */
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
