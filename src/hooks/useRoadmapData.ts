import { useLiveQuery } from 'dexie-react-hooks';

import {
  monthRepository,
  settingsRepository,
  skillRepository,
  stepRepository,
  weekRepository,
} from '@/db/repositories';
import type { RoadmapData, Settings } from '@/types';

export type RoadmapSnapshot = RoadmapData & { settings: Settings };

/**
 * ロードマップ全体（月・ステップ・週・チェック項目）と設定を読み込む。
 * データが変わると自動で読み直す。読み込み中は undefined を返す
 */
export function useRoadmapData(): RoadmapSnapshot | undefined {
  return useLiveQuery(async () => {
    const [months, steps, weeks, skills, settings] = await Promise.all([
      monthRepository.getAll(),
      stepRepository.getAll(),
      weekRepository.getAll(),
      skillRepository.getAll(),
      settingsRepository.get(),
    ]);
    if (!settings) return undefined;
    return { months, steps, weeks, skills, settings };
  });
}
