import { describe, expect, it } from 'vitest';

import { createInitialRoadmap } from '@/data/initialRoadmap';
import { db } from '@/db/database';
import { createInitialSettings, seedIfEmpty } from '@/db/seed';
import { type BackupData, parseBackup, stringifyBackup } from '@/lib/backup';

import { buildLog } from '../../../tests/factories';
import { dataService } from './dataService';

const NOW = new Date('2026-11-19T01:30:00.000Z');

describe('dataService.exportAll', () => {
  it('全テーブルと設定を、エクスポートの形にまとめる', async () => {
    await seedIfEmpty('2026-11-16');
    await db.logs.add(buildLog({ id: 'log-1', weekId: 'week-01' }));
    await db.badges.add({ id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' });

    const backup = await dataService.exportAll(NOW);

    expect(backup).toMatchObject({
      app: 'java-study-tracker',
      schemaVersion: 1,
      exportedAt: '2026-11-19T01:30:00.000Z',
    });
    expect(backup.data.weeks).toHaveLength(10);
    expect(backup.data.skills).toHaveLength(40);
    expect(backup.data.logs.map((log) => log.id)).toEqual(['log-1']);
    expect(backup.data.settings).toEqual(createInitialSettings('2026-11-16'));
  });

  it('エクスポートしたものは、そのまま検証を通る', async () => {
    await seedIfEmpty('2026-11-16');

    const backup = await dataService.exportAll(NOW);

    expect(parseBackup(stringifyBackup(backup), 1)).toEqual({ ok: true, backup });
  });

  it('設定がなければエクスポートしない', async () => {
    await expect(dataService.exportAll(NOW)).rejects.toThrow('設定が見つからない');
  });
});

describe('dataService.importAll', () => {
  it('今のデータをすべて消して、読み込んだデータに置き換える', async () => {
    await seedIfEmpty('2026-11-16');
    await db.logs.add(buildLog({ id: 'old-log' }));
    await db.badges.add({ id: 'streak-3', earnedAt: '2026-11-18T10:00:00.000Z' });

    const roadmap = createInitialRoadmap();
    const data: BackupData = {
      months: roadmap.months.slice(0, 1),
      steps: roadmap.steps.slice(0, 1),
      weeks: roadmap.weeks.slice(0, 2),
      skills: roadmap.skills.slice(0, 3),
      logs: [buildLog({ id: 'new-log', weekId: 'week-01' })],
      badges: [{ id: 'first-log', earnedAt: '2026-11-10T10:00:00.000Z' }],
      settings: { ...createInitialSettings('2026-11-02'), theme: 'dark' },
    };

    await dataService.importAll(data);

    expect(await db.months.count()).toBe(1);
    expect(await db.weeks.count()).toBe(2);
    expect(await db.skills.count()).toBe(3);
    expect((await db.logs.toArray()).map((log) => log.id)).toEqual(['new-log']);
    expect((await db.badges.toArray()).map((badge) => badge.id)).toEqual(['first-log']);
    expect(await db.settings.get('app')).toMatchObject({ startDate: '2026-11-02', theme: 'dark' });
  });

  it('途中で失敗したら、何も変えない', async () => {
    await seedIfEmpty('2026-11-16');
    const roadmap = createInitialRoadmap();
    // 同じIDが2つあると、書き込みの途中で失敗する
    const duplicated = buildLog({ id: 'dup' });

    await expect(
      dataService.importAll({
        ...roadmap,
        logs: [duplicated, duplicated],
        badges: [],
        settings: createInitialSettings('2026-11-02'),
      }),
    ).rejects.toThrow();

    expect(await db.settings.get('app')).toMatchObject({ startDate: '2026-11-16' });
    expect(await db.weeks.count()).toBe(10);
  });
});

describe('dataService.resetAll', () => {
  it('すべてを消し、初めて開いたときの状態にする', async () => {
    await seedIfEmpty('2026-11-01');
    await db.weeks.update('week-01', { status: 'done' });
    await db.logs.add(buildLog());
    await db.badges.add({ id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' });
    await db.settings.update('app', { theme: 'dark', breakPeriods: [] });

    await dataService.resetAll('2026-11-19');

    expect(await db.weeks.get('week-01')).toMatchObject({ status: 'not_started' });
    expect(await db.logs.count()).toBe(0);
    expect(await db.badges.count()).toBe(0);
    expect(await db.settings.get('app')).toEqual(createInitialSettings('2026-11-19'));
  });
});
