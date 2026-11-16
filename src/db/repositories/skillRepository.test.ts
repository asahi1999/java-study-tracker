import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { buildSkill } from '../../../tests/factories';
import { skillRepository } from './skillRepository';

describe('skillRepository', () => {
  it('getByWeek はその週の項目だけを表示順に返す', async () => {
    await db.skills.bulkAdd([
      buildSkill({ id: 's2', weekId: 'w1', order: 2 }),
      buildSkill({ id: 's1', weekId: 'w1', order: 1 }),
      buildSkill({ id: 'other', weekId: 'w2', order: 1 }),
    ]);

    const skills = await skillRepository.getByWeek('w1');

    expect(skills.map((skill) => skill.id)).toEqual(['s1', 's2']);
  });

  it('getByWeek は項目のない週なら空の配列を返す', async () => {
    expect(await skillRepository.getByWeek('none')).toEqual([]);
  });

  it('getById はIDが一致する項目を返し、なければ undefined を返す', async () => {
    await db.skills.add(buildSkill({ id: 's1', label: '変数' }));

    expect(await skillRepository.getById('s1')).toEqual(buildSkill({ id: 's1', label: '変数' }));
    expect(await skillRepository.getById('none')).toBeUndefined();
  });

  it('getAll はすべての週の項目を返す', async () => {
    await db.skills.bulkAdd([
      buildSkill({ id: 's1', weekId: 'w1' }),
      buildSkill({ id: 's2', weekId: 'w2' }),
    ]);

    expect(await skillRepository.getAll()).toHaveLength(2);
  });

  it('add はIDを発行して保存する', async () => {
    const added = await skillRepository.add({
      weekId: 'w1',
      order: 1,
      label: 'Stream API',
      checked: false,
      checkedAt: null,
    });

    expect(added.id).not.toBe('');
    expect(await db.skills.get(added.id)).toEqual(added);
  });

  it('update は指定した項目だけを変更する', async () => {
    await db.skills.add(buildSkill({ id: 's1', label: '変更前' }));

    await skillRepository.update('s1', { label: '変更後' });

    expect(await db.skills.get('s1')).toEqual(buildSkill({ id: 's1', label: '変更後' }));
  });

  it('setChecked でチェックすると、チェックした日を記録する', async () => {
    await db.skills.add(buildSkill({ id: 's1' }));

    await skillRepository.setChecked('s1', true, '2026-11-18');

    expect(await db.skills.get('s1')).toMatchObject({ checked: true, checkedAt: '2026-11-18' });
  });

  it('setChecked でチェックを外すと、日付も消す', async () => {
    await db.skills.add(buildSkill({ id: 's1', checked: true, checkedAt: '2026-11-18' }));

    await skillRepository.setChecked('s1', false, '2026-11-19');

    expect(await db.skills.get('s1')).toMatchObject({ checked: false, checkedAt: null });
  });

  it('remove は項目を削除する', async () => {
    await db.skills.add(buildSkill({ id: 's1' }));

    await skillRepository.remove('s1');

    expect(await db.skills.get('s1')).toBeUndefined();
  });
});
