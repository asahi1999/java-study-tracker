import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { BadgeStamp } from '@/features/badges/BadgeStamp';
import { getRecentBadges } from '@/lib/badges';
import { toDateString } from '@/lib/date';
import { formatDateWithWeekday } from '@/lib/format';
import type { EarnedBadge } from '@/types';

const RECENT_BADGE_COUNT = 3;

/** 最近獲得したバッジ（新しい順に3件） */
export function RecentBadges({ earned }: { earned: readonly EarnedBadge[] }) {
  const badges = getRecentBadges(earned, BADGE_DEFINITIONS, RECENT_BADGE_COUNT);

  return (
    <Card
      title="最近獲得したバッジ"
      action={
        <Link to="/badges" className="text-[13px] font-bold underline underline-offset-2">
          バッジをすべて見る
        </Link>
      }
    >
      {badges.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          バッジはまだありません。最初の学習ログを記録すると「はじめの一歩」を獲得できます。
        </p>
      ) : (
        <ul className="grid gap-3">
          {badges.map((badge) => (
            <li key={badge.id} className="flex items-center gap-3">
              <BadgeStamp id={badge.id} earned size="sm" />
              <div className="min-w-0 leading-snug">
                <p className="text-sm font-bold">{badge.name}</p>
                <p className="text-[13px] text-muted">
                  {badge.condition}
                  <span aria-hidden> ・ </span>
                  {/* 獲得した日時は、ローカル時刻の日付にして表示する */}
                  {formatDateWithWeekday(toDateString(new Date(badge.earnedAt)))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
