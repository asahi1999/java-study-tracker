import { describe, expect, it } from 'vitest';

import {
  conceptsSchema,
  courseSchema,
  errorsSchema,
  giftsSchema,
  problemFrontSchema,
  projectFrontSchema,
} from './schema.ts';

const fill = {
  id: 'ch00.sign',
  rev: 1,
  type: 'fill',
  title: '看板',
  chapter: 0,
  part: 1,
  order: 10,
  concepts: ['println'],
  minutes: 2,
  source: 'compact',
  judge: { mode: 'output', cases: [{ name: '看板' }] },
  reviewed: false,
};

function errorsOf(value: unknown): string[] {
  const r = problemFrontSchema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('problemFrontSchema', () => {
  it('正しい fill を通し、既定値を入れる', () => {
    const r = problemFrontSchema.parse(fill);
    expect(r).toMatchObject({
      optional: false,
      runtime: 'browser',
      render: 'text',
      timeoutMs: 3000,
      stdin: '',
    });
    expect(r.judge?.cases?.[0]).toEqual({ name: '看板', stdin: '' });
  });

  it('正しい card・predict・quiz を通す', () => {
    const base = {
      id: 'ch00.a',
      rev: 1,
      title: 'a',
      chapter: 0,
      part: 1,
      order: 10,
      minutes: 1,
      reviewed: true,
    };
    expect(errorsOf({ ...base, type: 'card' })).toEqual([]);
    expect(
      errorsOf({ ...base, type: 'predict', concepts: ['x'], source: 'compact', inputMode: 'text' }),
    ).toEqual([]);
    expect(
      errorsOf({
        ...base,
        type: 'predict',
        concepts: ['x'],
        source: 'compact',
        inputMode: 'choice',
        choices: ['a', 'b'],
      }),
    ).toEqual([]);
    expect(errorsOf({ ...base, type: 'quiz', choices: ['a', 'b', 'c'], answer: 2 })).toEqual([]);
  });

  it.each([
    ['id の形', { id: 'ch0.sign' }, 'id'],
    ['rev は1以上', { rev: 0 }, 'rev'],
    ['title は20文字まで', { title: 'あ'.repeat(21) }, 'title'],
    ['chapter は0〜9', { chapter: 10 }, 'chapter'],
    ['minutes は1〜3', { minutes: 4 }, 'minutes'],
    ['timeoutMs は1000〜10000', { timeoutMs: 500 }, 'timeoutMs'],
    ['知らない項目', { color: 'red' }, ''],
    ['type の値', { type: 'essay' }, 'type'],
    ['goal は20文字まで', { goal: 'あ'.repeat(21) }, 'goal'],
  ])('%s', (_name, patch, path) => {
    const errors = errorsOf({ ...fill, ...patch });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.startsWith(path))).toBe(true);
  });

  it.each([
    ['書く問題に judge が無い', { judge: undefined }, 'judge'],
    ['mode: output に cases が無い', { judge: { mode: 'output' } }, 'judge'],
    ['mode: tests に cases がある', { judge: { mode: 'tests', cases: [{ name: 'a' }] } }, 'judge'],
    ['concepts が無い', { concepts: [] }, 'concepts'],
    ['source が無い', { source: undefined }, 'source'],
    ['fill に inputMode', { inputMode: 'text' }, 'inputMode'],
    ['fill に answer', { answer: 0 }, 'answer'],
    ['tiles は render: tiles のときだけ', { tiles: { S: 'slime' } }, 'tiles'],
    [
      'exception に type が無い',
      { expectError: { kind: 'exception', dex: 'arithmetic' } },
      'expectError',
    ],
    ['compile に dex が無い', { expectError: { kind: 'compile' } }, 'expectError'],
    ['test に dex', { expectError: { kind: 'test', dex: 'x' } }, 'expectError'],
  ])('%s', (_name, patch, path) => {
    expect(errorsOf({ ...fill, ...patch }).some((e) => e.startsWith(path))).toBe(true);
  });

  it('fix には expectError が必須', () => {
    expect(errorsOf({ ...fill, type: 'fix' }).some((e) => e.startsWith('expectError'))).toBe(true);
    expect(
      errorsOf({
        ...fill,
        type: 'fix',
        expectError: { kind: 'compile', dex: 'semicolon-expected' },
      }),
    ).toEqual([]);
  });

  it('種類と項目の組み合わせ: predict に judge、quiz の answer が範囲外', () => {
    const predict = { ...fill, type: 'predict', inputMode: 'text' };
    expect(errorsOf(predict).some((e) => e.startsWith('judge'))).toBe(true);
    const quiz = {
      ...fill,
      type: 'quiz',
      judge: undefined,
      source: undefined,
      choices: ['a', 'b'],
      answer: 2,
    };
    expect(errorsOf(quiz).some((e) => e.startsWith('answer'))).toBe(true);
    expect(errorsOf({ ...quiz, answer: undefined }).some((e) => e.startsWith('answer'))).toBe(true);
  });

  it('predict の choice には choices が必須、text には書かない', () => {
    const base = { ...fill, type: 'predict', judge: undefined };
    expect(errorsOf({ ...base, inputMode: 'choice' }).some((e) => e.startsWith('choices'))).toBe(
      true,
    );
    expect(
      errorsOf({ ...base, inputMode: 'text', choices: ['a', 'b'] }).some((e) =>
        e.startsWith('choices'),
      ),
    ).toBe(true);
    expect(errorsOf({ ...base }).some((e) => e.startsWith('inputMode'))).toBe(true);
  });
});

describe('courseSchema', () => {
  const chapter = {
    id: 'ch00',
    number: 0,
    title: 'はじめの一歩',
    dungeon: { version: 'v0.0', adds: '入口' },
    plannedMinutes: 72,
    askStage: 'println まで',
    parts: [{ n: 1, title: '入口' }],
    allow: { keywords: ['void'], apis: [] },
    project: 'p00',
  };

  it('正しいものを通す', () => {
    expect(courseSchema.safeParse({ version: '2026.12.01-1', chapters: [chapter] }).success).toBe(
      true,
    );
  });

  it('id と number の不一致・部品の重複・章の重複・版の形', () => {
    expect(
      courseSchema.safeParse({ version: '2026.12.01-1', chapters: [{ ...chapter, id: 'ch01' }] })
        .success,
    ).toBe(false);
    const dupParts = {
      ...chapter,
      parts: [
        { n: 1, title: 'a' },
        { n: 1, title: 'b' },
      ],
    };
    expect(courseSchema.safeParse({ version: '2026.12.01-1', chapters: [dupParts] }).success).toBe(
      false,
    );
    expect(
      courseSchema.safeParse({ version: '2026.12.01-1', chapters: [chapter, chapter] }).success,
    ).toBe(false);
    expect(courseSchema.safeParse({ version: '1.0', chapters: [chapter] }).success).toBe(false);
  });
});

describe('errorsSchema', () => {
  const entry = {
    id: 'semicolon-expected',
    no: 1,
    name: ';忘れ',
    kind: 'compile',
    match: { javacEn: ["^';' expected$"], javacJa: ["^';'がありません$"] },
    summary: 's',
    causes: ['c'],
    fix: 'f',
    chapter: 0,
  };

  it('正しいものを通す', () => {
    expect(errorsSchema.safeParse([entry]).success).toBe(true);
    expect(
      errorsSchema.safeParse([{ ...entry, id: 'loop', kind: 'limit', match: undefined }]).success,
    ).toBe(true);
  });

  it('compile に javacJa が無い・runtime に exception が無い・正規表現が壊れている', () => {
    expect(errorsSchema.safeParse([{ ...entry, match: { javacEn: ['a'] } }]).success).toBe(false);
    expect(errorsSchema.safeParse([{ ...entry, kind: 'runtime', match: {} }]).success).toBe(false);
    expect(
      errorsSchema.safeParse([{ ...entry, match: { javacEn: ['('], javacJa: ['a'] } }]).success,
    ).toBe(false);
  });
});

describe('conceptsSchema・giftsSchema', () => {
  it('形を確かめる', () => {
    expect(
      conceptsSchema.safeParse([{ id: 'for', name: 'for 文', chapter: 2, oneLine: 'くりかえす' }])
        .success,
    ).toBe(true);
    expect(
      conceptsSchema.safeParse([{ id: 'For', name: 'x', chapter: 2, oneLine: 'x' }]).success,
    ).toBe(false);
    expect(
      giftsSchema.safeParse([{ id: 'floor-moss', name: '苔', tile: 'floor', sprite: 'floor-moss' }])
        .success,
    ).toBe(true);
    expect(giftsSchema.safeParse([{ id: 'a', name: 'a', tile: 'sky', sprite: 'a' }]).success).toBe(
      false,
    );
  });
});

describe('projectFrontSchema', () => {
  const project = {
    id: 'p03',
    rev: 1,
    chapter: 3,
    title: '迷路を歩く',
    source: 'compact',
    mainFile: 'Maze.java',
    learnerFiles: ['Maze.java'],
    stages: [
      {
        id: 'load',
        n: 1,
        title: '読む',
        minutes: 20,
        mode: 'output',
        cases: [{ name: '小さなマップ' }],
      },
      { id: 'walk', n: 2, title: '歩く', minutes: 20, mode: 'tests' },
    ],
    reviewed: false,
  };

  it('正しいものを通す', () => {
    expect(projectFrontSchema.safeParse(project).success).toBe(true);
  });

  it('mainFile が learnerFiles に無い・段階の重複・n の飛び・output に cases が無い', () => {
    expect(projectFrontSchema.safeParse({ ...project, mainFile: 'Other.java' }).success).toBe(
      false,
    );
    const dup = { ...project, stages: [project.stages[0], { ...project.stages[1], id: 'load' }] };
    expect(projectFrontSchema.safeParse(dup).success).toBe(false);
    const gap = { ...project, stages: [project.stages[0], { ...project.stages[1], n: 3 }] };
    expect(projectFrontSchema.safeParse(gap).success).toBe(false);
    const noCases = { ...project, stages: [{ ...project.stages[0], cases: [] }] };
    expect(projectFrontSchema.safeParse(noCases).success).toBe(false);
  });
});
