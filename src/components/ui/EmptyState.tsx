import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** 次にやることへ進むボタンやリンク */
  action?: ReactNode;
};

/** データがまだないときの表示。何もないことだけでなく、次に何をすればいいかを伝える */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <Icon aria-hidden className="size-8 text-muted" strokeWidth={1.75} />
      <p className="mt-3 font-bold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
