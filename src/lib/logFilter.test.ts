import { describe, expect, it } from 'vitest';

import { buildLog } from '../../tests/factories';
import { EMPTY_LOG_FILTER, filterLogs, isLogFilterEmpty, NO_WEEK } from './logFilter';

const WEEKS = [
  { id: 'w1', stepId: 'step-1' },
  { id: 'w2', stepId: 'step-1' },
  { id: 'w3', stepId: 'step-2' },
];

const LOGS = [
  buildLog({ id: 'a', date: '2026-11-20', weekId: 'w3' }),
  buildLog({ id: 'b', date: '2026-11-18', weekId: 'w2' }),
  buildLog({ id: 'c', date: '2026-11-17', weekId: null }),
  buildLog({ id: 'd', date: '2026-11-16', weekId: 'w1' }),
];

const idsOf = (filter: Partial<typeof EMPTY_LOG_FILTER>) =>
  filterLogs(LOGS, { ...EMPTY_LOG_FILTER, ...filter }, WEEKS).map(({ id }) => id);

describe('filterLogs', () => {
  it('条件がなければ、すべてのログを元の順番で返す', () => {
    expect(idsOf({})).toEqual(['a', 'b', 'c', 'd']);
  });

  it('開始日を指定すると、その日以降のログだけにする（その日を含む）', () => {
    expect(idsOf({ from: '2026-11-18' })).toEqual(['a', 'b']);
  });

  it('終了日を指定すると、その日以前のログだけにする（その日を含む）', () => {
    expect(idsOf({ to: '2026-11-17' })).toEqual(['c', 'd']);
  });

  it('開始日と終了日の両方を指定できる', () => {
    expect(idsOf({ from: '2026-11-17', to: '2026-11-18' })).toEqual(['b', 'c']);
  });

  it('開始日が終了日より後なら、1件も返さない', () => {
    expect(idsOf({ from: '2026-11-20', to: '2026-11-16' })).toEqual([]);
  });

  it('週を指定すると、その週のログだけにする', () => {
    expect(idsOf({ weekId: 'w2' })).toEqual(['b']);
  });

  it('「週の指定なし」を選ぶと、週が付いていないログだけにする', () => {
    expect(idsOf({ weekId: NO_WEEK })).toEqual(['c']);
  });

  it('ステップを指定すると、そのステップに属する週のログだけにする', () => {
    expect(idsOf({ stepId: 'step-1' })).toEqual(['b', 'd']);
  });

  it('ステップを指定すると、週が付いていないログは除く', () => {
    expect(idsOf({ stepId: 'step-2' })).toEqual(['a']);
  });

  it('削除された週のログは、ステップで絞り込むと除く', () => {
    const logs = [buildLog({ id: 'x', weekId: 'deleted-week' })];

    expect(filterLogs(logs, { ...EMPTY_LOG_FILTER, stepId: 'step-1' }, WEEKS)).toEqual([]);
  });

  it('複数の条件は、すべて満たすログだけにする', () => {
    expect(idsOf({ stepId: 'step-1', from: '2026-11-17' })).toEqual(['b']);
    expect(idsOf({ stepId: 'step-2', weekId: 'w1' })).toEqual([]);
  });

  it('元の配列を書き換えない', () => {
    const before = [...LOGS];
    idsOf({ weekId: 'w1' });

    expect(LOGS).toEqual(before);
  });
});

describe('isLogFilterEmpty', () => {
  it('何も指定していなければ true', () => {
    expect(isLogFilterEmpty(EMPTY_LOG_FILTER)).toBe(true);
  });

  it.each([
    [{ from: '2026-11-16' }],
    [{ to: '2026-11-16' }],
    [{ weekId: 'w1' }],
    [{ stepId: 'step-1' }],
  ])('どれか1つでも指定していれば false（%o）', (filter) => {
    expect(isLogFilterEmpty({ ...EMPTY_LOG_FILTER, ...filter })).toBe(false);
  });
});
