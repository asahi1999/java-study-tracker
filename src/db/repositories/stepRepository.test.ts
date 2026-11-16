import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import type { Step } from '@/types';

import { buildWeek } from '../../../tests/factories';
import { HasWeeksError } from './errors';
import { stepRepository } from './stepRepository';

function buildStep(overrides: Partial<Step> = {}): Step {
  return { id: 'a', order: 1, title: 'Javaの基礎', description: '', advice: '', ...overrides };
}

describe('stepRepository', () => {
  it('getAll は表示順に並べて返す', async () => {
    await db.steps.bulkAdd([
      buildStep({ id: 'b', order: 2 }),
      buildStep({ id: 'a', order: 1 }),
      buildStep({ id: 'c', order: 3 }),
    ]);

    const steps = await stepRepository.getAll();

    expect(steps.map((step) => step.id)).toEqual(['a', 'b', 'c']);
  });

  it('add はIDを発行して保存する', async () => {
    const added = await stepRepository.add({
      order: 9,
      title: 'デプロイ',
      description: '公開の方法',
      advice: '小さく試す',
    });

    expect(added.id).not.toBe('');
    expect(await stepRepository.getById(added.id)).toEqual(added);
  });

  it('update は指定した項目だけを変更する', async () => {
    await db.steps.add(buildStep({ advice: '変更前' }));

    await stepRepository.update('a', { advice: '変更後' });

    expect(await stepRepository.getById('a')).toEqual(buildStep({ advice: '変更後' }));
  });

  it('remove は週のないステップを削除する', async () => {
    await db.steps.add(buildStep());

    await stepRepository.remove('a');

    expect(await stepRepository.getById('a')).toBeUndefined();
  });

  it('remove は週が残っているステップを削除しない', async () => {
    await db.steps.add(buildStep());
    await db.weeks.add(buildWeek({ stepId: 'a' }));

    await expect(stepRepository.remove('a')).rejects.toBeInstanceOf(HasWeeksError);
    expect(await stepRepository.getById('a')).toBeDefined();
  });
});
