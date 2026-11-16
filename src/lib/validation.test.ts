import { describe, expect, it } from 'vitest';

import { createWeekDatesSchema, getFieldErrors, repoUrlSchema } from './validation';

describe('repoUrlSchema', () => {
  it('https://github.com/ で始まるURLを認める', () => {
    const result = repoUrlSchema.safeParse('https://github.com/asahi1999/number-guess');

    expect(result.success).toBe(true);
  });

  it('未入力（空文字）は認める', () => {
    expect(repoUrlSchema.safeParse('').success).toBe(true);
  });

  it('前後の空白は取り除く', () => {
    expect(repoUrlSchema.parse('  https://github.com/asahi1999/todo  ')).toBe(
      'https://github.com/asahi1999/todo',
    );
    expect(repoUrlSchema.parse('   ')).toBe('');
  });

  it.each([
    ['http で始まる', 'http://github.com/asahi1999/todo'],
    ['GitHub 以外のサイト', 'https://gitlab.com/asahi1999/todo'],
    ['似た名前のサイト', 'https://github.com.example.com/todo'],
    ['https://github.com/ だけ', 'https://github.com/'],
    ['途中に空白がある', 'https://github.com/asahi 1999/todo'],
    ['URLでない文字列', 'number-guess'],
  ])('%s（%s）は認めず、日本語のメッセージを返す', (_label, value) => {
    const result = repoUrlSchema.safeParse(value);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'https://github.com/ で始まるURLを入力してください',
    );
  });
});

describe('createWeekDatesSchema', () => {
  const TODAY = '2026-11-20';

  function validate(input: { startedAt: string; completedAt: string }, isDone = false) {
    const result = createWeekDatesSchema({ today: TODAY, isDone }).safeParse(input);
    return result.success ? {} : getFieldErrors(result.error);
  }

  it('どちらも未入力なら問題なし', () => {
    expect(validate({ startedAt: '', completedAt: '' })).toEqual({});
  });

  it('今日までの日付なら問題なし', () => {
    expect(validate({ startedAt: '2026-11-16', completedAt: '2026-11-20' })).toEqual({});
  });

  it('開始日と完了日が同じ日でも問題なし', () => {
    expect(validate({ startedAt: '2026-11-18', completedAt: '2026-11-18' })).toEqual({});
  });

  it('存在しない日付はエラーにする', () => {
    expect(validate({ startedAt: '2026-02-30', completedAt: '' })).toEqual({
      startedAt: '日付を正しく入力してください',
    });
  });

  it('今日より先の日付はエラーにする', () => {
    expect(validate({ startedAt: '2026-11-21', completedAt: '' })).toEqual({
      startedAt: '今日より先の日付は入力できません',
    });
  });

  it('完了日が開始日より前ならエラーにする', () => {
    expect(validate({ startedAt: '2026-11-18', completedAt: '2026-11-17' })).toEqual({
      completedAt: '完了日は開始日以降の日付にしてください',
    });
  });

  it('完成した週の完了日を空にするとエラーにする', () => {
    expect(validate({ startedAt: '2026-11-16', completedAt: '' }, true)).toEqual({
      completedAt: '完成した週の完了日は空にできません',
    });
  });

  it('完成していない週なら完了日は空でよい', () => {
    expect(validate({ startedAt: '2026-11-16', completedAt: '' }, false)).toEqual({});
  });
});

describe('getFieldErrors', () => {
  it('同じ項目に複数のエラーがあれば、最初の1つだけを返す', () => {
    const result = createWeekDatesSchema({ today: '2026-11-20', isDone: true }).safeParse({
      startedAt: 'abc',
      completedAt: 'xyz',
    });

    expect(result.success).toBe(false);
    expect(getFieldErrors(result.error!)).toEqual({
      startedAt: '日付を正しく入力してください',
      completedAt: '日付を正しく入力してください',
    });
  });
});
