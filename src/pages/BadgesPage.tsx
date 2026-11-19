import { useLiveQuery } from 'dexie-react-hooks';

import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { badgeRepository } from '@/db/repositories';
import { BadgeStamp, stampTilt } from '@/features/badges/BadgeStamp';
import { toDateString } from '@/lib/date';
import { formatDateWithWeekday } from '@/lib/format';

export function BadgesPage() {
  const earned = useLiveQuery(() => badgeRepository.getAll());

  if (!earned) {
    return (
      <>
        <PageHeader title="実績バッジ" />
        <LoadingText />
      </>
    );
  }

  const earnedAtById = new Map(earned.map((badge) => [badge.id, badge.earnedAt]));
  const earnedCount = BADGE_DEFINITIONS.filter((badge) => earnedAtById.has(badge.id)).length;

  return (
    <>
      <PageHeader
        title="実績バッジ"
        description="条件を満たすと、駅のスタンプのように押されていきます。"
        actions={
          <p className="text-sm leading-none">
            <span className="font-num text-3xl font-bold">{earnedCount}</span>
            <span className="text-muted"> / {BADGE_DEFINITIONS.length} 獲得</span>
          </p>
        }
      />

      {/* スタンプ帳のように、枠の位置は決まった順に並べる（獲得しても並びは変えない） */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {BADGE_DEFINITIONS.map((badge, index) => {
          const earnedAt = earnedAtById.get(badge.id);
          const isEarned = earnedAt !== undefined;
          return (
            <li
              key={badge.id}
              className={`flex flex-col items-center rounded-md border px-3 pb-4 pt-5 text-center ${
                isEarned ? 'border-line bg-surface' : 'border-dashed border-line bg-transparent'
              }`}
            >
              <BadgeStamp id={badge.id} earned={isEarned} tilt={stampTilt(index)} />
              <p className={`mt-3 text-sm font-bold leading-snug ${isEarned ? '' : 'text-muted'}`}>
                {badge.name}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-muted">{badge.condition}</p>
              <p
                className={`mt-auto pt-3 text-xs leading-none ${isEarned ? 'font-bold' : 'text-muted'}`}
              >
                {isEarned
                  ? `${formatDateWithWeekday(toDateString(new Date(earnedAt)))}に獲得`
                  : '未獲得'}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
