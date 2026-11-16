import { CalendarOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buttonClassName } from '@/components/ui/Button';

/** 休止期間がまだ1件も登録されていないときに出す案内 */
export function BreakNotice() {
  return (
    <section
      aria-label="休止期間の案内"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border border-dashed border-muted p-4"
    >
      <CalendarOff aria-hidden className="size-5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-bold">休止期間はまだ登録されていません</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
          年末年始など学習を休む期間を登録すると、その日数だけ予定日がうしろにずれます。
        </p>
      </div>
      <Link to="/settings" className={buttonClassName({ size: 'sm' })}>
        設定で登録する
      </Link>
    </section>
  );
}
