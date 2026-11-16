import { logRepository, skillRepository, weekRepository } from '@/db/repositories';
import { getAutoStartChanges } from '@/lib/weekStatus';

/**
 * 未着手の週に、チェック済みの項目か学習ログがあれば「進行中」にする。
 * チェックをつけたとき・学習ログを足したときの両方から呼ぶ。
 * skills・weeks・logs を含むトランザクションの中で呼ぶこと
 */
export async function startWeekIfTouched(weekId: string, today: string): Promise<void> {
  const week = await weekRepository.getById(weekId);
  if (!week) return;

  const [skills, logs] = await Promise.all([
    skillRepository.getByWeek(weekId),
    logRepository.getByWeek(weekId),
  ]);
  const changes = getAutoStartChanges(week, skills, logs, today);
  if (changes) await weekRepository.update(weekId, changes);
}
