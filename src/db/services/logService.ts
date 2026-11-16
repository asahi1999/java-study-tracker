import { db } from '@/db/database';
import { logRepository } from '@/db/repositories';
import { todayString } from '@/lib/date';
import type { StudyLog } from '@/types';

import { startWeekIfTouched } from './autoStart';

type LogInput = Omit<StudyLog, 'id' | 'createdAt'>;

export const logService = {
  /** 学習ログを足す。その週が未着手なら「進行中」にする */
  async add(input: LogInput, today: string = todayString()): Promise<StudyLog> {
    return db.transaction('rw', [db.logs, db.weeks, db.skills], async () => {
      const log = await logRepository.add(input);
      if (log.weekId) await startWeekIfTouched(log.weekId, today);
      return log;
    });
  },

  /** 学習ログを書き換える。週を付け替えた先が未着手なら「進行中」にする */
  async update(
    id: string,
    changes: Partial<Omit<LogInput, 'source'>>,
    today: string = todayString(),
  ): Promise<void> {
    await db.transaction('rw', [db.logs, db.weeks, db.skills], async () => {
      await logRepository.update(id, changes);
      if (changes.weekId) await startWeekIfTouched(changes.weekId, today);
    });
  },

  /** 学習ログを削除する。ログがなくなっても、週を「未着手」には戻さない */
  async remove(id: string): Promise<void> {
    await logRepository.remove(id);
  },
};
