import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';

import { BADGE_DEFINITIONS } from '@/data/badges';
import {
  badgeRepository,
  logRepository,
  settingsRepository,
  weekRepository,
} from '@/db/repositories';
import { badgeService } from '@/db/services/badgeService';
import { createBadgeToast } from '@/features/badges/badgeToast';
import { evaluateBadges, getNewBadgeIds } from '@/lib/badges';
import { useToastStore } from '@/stores/toastStore';

/**
 * バッジの獲得を見張る。全画面で1つだけ使う。
 *
 * 週・学習ログ・設定が変わるたびに条件を判定し、新しく満たしたバッジを獲得済みにして通知を出す。
 * 書き込む場所（タイマー・手動のログ・チェック・編集・インポートなど）ごとに判定を足さなくても、
 * データの変化から1か所で判定できるようにしている
 */
export function useBadgeWatcher(): void {
  const snapshot = useLiveQuery(async () => {
    const [weeks, logs, settings, badges] = await Promise.all([
      weekRepository.getAll(),
      logRepository.getAll(),
      settingsRepository.get(),
      badgeRepository.getAll(),
    ]);
    return settings ? { weeks, logs, settings, badges } : null;
  });
  const show = useToastStore((state) => state.show);

  const newIds = useMemo(
    () =>
      snapshot ? getNewBadgeIds(evaluateBadges(snapshot), snapshot.badges, BADGE_DEFINITIONS) : [],
    [snapshot],
  );
  // 配列は描画のたびに別物になるので、中身を文字列にして変化を見る
  const key = newIds.join(' ');

  useEffect(() => {
    if (key === '') return;
    // 同じ判定が2回走っても、2回目は「すでに獲得済み」として何も返らないので、通知は1回だけになる
    badgeService
      .awardNew(key.split(' '))
      .then((awarded) => {
        if (awarded.length > 0) show(createBadgeToast(awarded));
      })
      .catch(() => {
        // 保存に失敗しても、次にデータが変わったときにもう一度判定する
      });
  }, [key, show]);
}
