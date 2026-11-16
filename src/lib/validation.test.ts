import { describe, expect, it } from 'vitest';

import {
  createLogInputSchema,
  createWeekDatesSchema,
  getFieldErrors,
  LOG_CONTENT_MAX_LENGTH,
  repoUrlSchema,
} from './validation';

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

describe('createLogInputSchema', () => {
  const schema = createLogInputSchema({ today: '2026-11-18' });
  const valid = { date: '2026-11-18', minutes: '45', weekId: 'week-01', content: 'for文の練習' };

  const errorsOf = (input: Partial<typeof valid>) => {
    const result = schema.safeParse({ ...valid, ...input });
    return result.success ? {} : getFieldErrors(result.error);
  };

  it('正しい入力を、保存できる形に直す', () => {
    expect(schema.parse(valid)).toEqual({
      date: '2026-11-18',
      minutes: 45,
      weekId: 'week-01',
      content: 'for文の練習',
    });
  });

  it('週が空文字なら null（週の指定なし）にする', () => {
    expect(schema.parse({ ...valid, weekId: '' }).weekId).toBeNull();
  });

  it('やったことは空でもよく、前後の空白は取り除く', () => {
    expect(schema.parse({ ...valid, content: '' }).content).toBe('');
    expect(schema.parse({ ...valid, content: '  読書  ' }).content).toBe('読書');
  });

  it('学習時間の前後の空白は無視する', () => {
    expect(schema.parse({ ...valid, minutes: ' 90 ' }).minutes).toBe(90);
  });

  it.each(['1', '1440'])('学習時間 %s 分は認める（範囲の端）', (minutes) => {
    expect(errorsOf({ minutes })).toEqual({});
  });

  it.each(['0', '1441'])('学習時間 %s 分は範囲外としてエラーにする', (minutes) => {
    expect(errorsOf({ minutes }).minutes).toBe('学習時間は1〜1440分で入力してください');
  });

  it.each(['', 'abc', '1.5', '-30', '１０'])(
    '学習時間「%s」は整数でないのでエラーにする',
    (minutes) => {
      expect(errorsOf({ minutes }).minutes).toBe('学習時間を分単位の整数で入力してください');
    },
  );

  it('日付が空ならエラーにする', () => {
    expect(errorsOf({ date: '' }).date).toBe('日付を入力してください');
  });

  it('存在しない日付はエラーにする', () => {
    expect(errorsOf({ date: '2026-02-30' }).date).toBe('日付を入力してください');
  });

  it('今日の日付は認め、今日より先の日付はエラーにする', () => {
    expect(errorsOf({ date: '2026-11-18' })).toEqual({});
    expect(errorsOf({ date: '2026-11-19' }).date).toBe('今日より先の日付は入力できません');
  });

  it('やったことが長すぎるとエラーにする', () => {
    expect(errorsOf({ content: 'あ'.repeat(LOG_CONTENT_MAX_LENGTH) })).toEqual({});
    expect(errorsOf({ content: 'あ'.repeat(LOG_CONTENT_MAX_LENGTH + 1) }).content).toBe(
      'やったことは500文字以内で入力してください',
    );
  });

  it('複数の項目に誤りがあれば、それぞれのエラーを返す', () => {
    expect(Object.keys(errorsOf({ date: '', minutes: '' })).sort()).toEqual(['date', 'minutes']);
  });
});
