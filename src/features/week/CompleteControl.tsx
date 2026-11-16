import { CircleCheck } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/Button';
import { weekService } from '@/db/services/weekService';
import { formatDateWithWeekday } from '@/lib/format';
import { canCompleteWeek } from '@/lib/weekStatus';
import type { Skill, Week } from '@/types';

type CompleteControlProps = {
  week: Week;
  /** この週のチェック項目 */
  skills: readonly Skill[];
  today: string;
  onError: (error: unknown) => void;
};

function getHint(skills: readonly Skill[]): string {
  if (skills.length === 0) return 'チェック項目がないので、いつでも完成にできます。';
  const remaining = skills.filter((skill) => !skill.checked).length;
  if (remaining === 0) return 'すべての項目をチェックしました。';
  return `あと${remaining}項目チェックすると、完成にできます。`;
}

/** 「完成にする」と「完成を取り消す」の操作 */
export function CompleteControl({ week, skills, today, onError }: CompleteControlProps) {
  const hintId = useId();

  if (week.status === 'done') {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          <CircleCheck aria-hidden className="size-5 text-status-green" />
          {week.completedAt ? `${formatDateWithWeekday(week.completedAt)}に完成` : '完成'}
        </p>
        <Button onClick={() => weekService.reopen(week.id).catch(onError)}>完成を取り消す</Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <p id={hintId} className="text-[13px] leading-relaxed text-muted">
        {getHint(skills)}
      </p>
      <Button
        variant="primary"
        disabled={!canCompleteWeek(week, skills)}
        aria-describedby={hintId}
        onClick={() => weekService.complete(week.id, today).catch(onError)}
      >
        完成にする
      </Button>
    </div>
  );
}
