import { Award } from 'lucide-react';

import { BADGE_DEFINITIONS } from '@/data/badges';
import type { Toast } from '@/stores/toastStore';

/** 新しく獲得したバッジを知らせる通知の中身。同時に複数獲得したら、1つの通知にまとめる */
export function createBadgeToast(ids: readonly string[]): Omit<Toast, 'id'> {
  const badges = ids.flatMap((id) => BADGE_DEFINITIONS.filter((badge) => badge.id === id));
  const action = { label: '実績バッジを見る', to: '/badges' };

  const [only] = badges;
  if (badges.length === 1 && only) {
    return {
      title: 'バッジを獲得しました',
      description: `「${only.name}」${only.condition}`,
      action,
      icon: Award,
    };
  }
  return {
    title: `バッジを${badges.length}個獲得しました`,
    description: badges.map((badge) => `「${badge.name}」`).join(''),
    action,
    icon: Award,
  };
}
