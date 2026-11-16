import { Lock } from 'lucide-react';
import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { weekService } from '@/db/services/weekService';
import { formatShortDate } from '@/lib/format';
import { calcProgress } from '@/lib/progress';
import { isChecklistLocked } from '@/lib/weekStatus';
import type { Skill, Week } from '@/types';

import { CompleteControl } from './CompleteControl';

type SkillChecklistProps = {
  week: Week;
  /** この週のチェック項目（表示順） */
  skills: readonly Skill[];
  today: string;
};

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : '保存できませんでした。もう一度試してください。';
}

/** 「身につくこと」のチェックリストと、週を完成にする操作 */
export function SkillChecklist({ week, skills, today }: SkillChecklistProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const locked = isChecklistLocked(week);
  const progress = calcProgress(skills);

  const handleError = (error: unknown) => setErrorMessage(toMessage(error));

  const handleToggle = (skill: Skill, checked: boolean) => {
    setErrorMessage(null);
    weekService.setSkillChecked(skill.id, checked, today).catch(handleError);
  };

  return (
    <Card
      title="身につくこと"
      action={
        <p className="text-[13px] leading-none text-muted">
          <span className="font-bold text-ink">{progress.checked}</span> / {progress.total} 項目
        </p>
      }
    >
      <ProgressBar value={progress.percent} label="この週の進捗" />

      {skills.length === 0 ? (
        <p className="mt-4 text-sm text-muted">チェック項目はありません。</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {skills.map((skill) => (
            <li key={skill.id}>
              <label
                className={`flex min-h-11 items-center gap-3 py-2 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={skill.checked}
                  disabled={locked}
                  onChange={(event) => handleToggle(skill, event.target.checked)}
                  className="size-5 shrink-0 accent-ink"
                />
                <span className="flex-1 leading-snug">{skill.label}</span>
                {skill.checkedAt && (
                  <span className="shrink-0 text-xs text-muted">
                    {formatShortDate(skill.checkedAt)}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}

      {locked && skills.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-muted">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
          完成にした週のチェックは変更できません。変更するには、完成を取り消してください。
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded bg-status-red-bg px-3 py-2 text-sm text-status-red-fg"
        >
          {errorMessage}
        </p>
      )}

      <CompleteControl week={week} skills={skills} today={today} onError={handleError} />
    </Card>
  );
}
