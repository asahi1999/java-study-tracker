import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { buildWeek } from '../../../tests/factories';
import { HasWeeksError } from './errors';
import { monthRepository } from './monthRepository';

describe('monthRepository', () => {
  it('getAll は表示順に並べて返す', async () => {
    await db.months.bulkAdd([
      { id: 'b', order: 2, title: '2ヶ月目', milestone: '' },
      { id: 'c', order: 3, title: '3ヶ月目', milestone: '' },
      { id: 'a', order: 1, title: '1ヶ月目', milestone: '' },
    ]);

    const months = await monthRepository.getAll();

    expect(months.map((month) => month.id)).toEqual(['a', 'b', 'c']);
  });

  it('add はIDを発行して保存する', async () => {
    const added = await monthRepository.add({ order: 4, title: '4ヶ月目', milestone: '応用' });

    expect(added.id).not.toBe('');
    expect(await monthRepository.getById(added.id)).toEqual(added);
  });

  it('update は指定した項目だけを変更する', async () => {
    await db.months.add({ id: 'a', order: 1, title: '1ヶ月目', milestone: '基礎' });

    await monthRepository.update('a', { milestone: '基礎を固める' });

    expect(await monthRepository.getById('a')).toEqual({
      id: 'a',
      order: 1,
      title: '1ヶ月目',
      milestone: '基礎を固める',
    });
  });

  it('remove は週のない月を削除する', async () => {
    await db.months.add({ id: 'a', order: 1, title: '1ヶ月目', milestone: '' });

    await monthRepository.remove('a');

    expect(await monthRepository.getById('a')).toBeUndefined();
  });

  it('remove は週が残っている月を削除しない', async () => {
    await db.months.add({ id: 'a', order: 1, title: '1ヶ月目', milestone: '' });
    await db.weeks.add(buildWeek({ monthId: 'a' }));

    await expect(monthRepository.remove('a')).rejects.toBeInstanceOf(HasWeeksError);
    expect(await monthRepository.getById('a')).toBeDefined();
  });
});
