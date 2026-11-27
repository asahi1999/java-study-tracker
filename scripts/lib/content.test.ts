import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  displayWidth,
  findReservedClassNames,
  loadContent,
  parseExpectLine,
  parseStarterMarks,
  splitFrontMatter,
  splitSections,
} from './content.ts';
import { ROOT } from './paths.ts';

const GOOD = path.join(ROOT, 'tests', 'content-fixtures', 'good');

describe('splitFrontMatter・splitSections', () => {
  it('前書きと本文に分ける', () => {
    expect(splitFrontMatter('---\nid: a\n---\n\n## 問題\n本文')).toEqual({
      front: 'id: a',
      body: '\n## 問題\n本文',
    });
    expect(splitFrontMatter('id: a')).toBeNull();
  });

  it('## 見出しで分け、コードブロックの中の ## は見出しにしない', () => {
    const r = splitSections('## 問題\nA\n```\n## 中\n```\n## 解説\nB\n');
    expect(r.sections).toEqual([
      { name: '問題', text: 'A\n```\n## 中\n```' },
      { name: '解説', text: 'B' },
    ]);
    expect(splitSections('前書き\n## 問題\nA').preamble).toBe('前書き');
  });
});

describe('parseStarterMarks', () => {
  it('//@write と //@fold〜//@end を取り除いて行番号にする', () => {
    const raw =
      'void main() {\n    //@fold 壁（読むだけ）\n    a();\n    b();\n    //@end\n    c(); //@write\n}\n';
    const { starter, errors } = parseStarterMarks(raw);
    expect(errors).toEqual([]);
    expect(starter.code).toBe('void main() {\n    a();\n    b();\n    c();\n}\n');
    expect(starter.writeLines).toEqual([4]);
    expect(starter.folds).toEqual([{ from: 2, to: 3, label: '壁（読むだけ）' }]);
  });

  it('閉じていない fold・説明の無い fold・対応の無い end・行の途中の印はエラー', () => {
    expect(parseStarterMarks('//@fold a\nx\n').errors).toHaveLength(1);
    expect(parseStarterMarks('//@fold\nx\n//@end').errors).toHaveLength(1);
    expect(parseStarterMarks('x\n//@end').errors).toHaveLength(1);
    expect(parseStarterMarks('x //@fold a').errors).toHaveLength(1);
  });
});

describe('parseExpectLine', () => {
  it.each([
    ['// expect: test', { kind: 'test' }],
    ['// expect: timeout', { kind: 'timeout' }],
    ['// expect: compile', { kind: 'compile', dex: null }],
    ['// expect: compile semicolon-expected', { kind: 'compile', dex: 'semicolon-expected' }],
    [
      '// expect: exception java.lang.ArithmeticException',
      { kind: 'exception', type: 'java.lang.ArithmeticException' },
    ],
  ])('%s', (first, decl) => {
    expect(parseExpectLine(`${first}\nvoid main() {}\n`)).toEqual({
      decl,
      content: 'void main() {}\n',
    });
  });

  it.each([
    'void main() {}',
    '// expect: crash',
    '// expect: exception',
    '// expect: test extra',
    '// expect: compile Bad_Id',
  ])('宣言の間違い: %s', (first) => {
    expect(parseExpectLine(`${first}\nx`)).toHaveProperty('error');
  });
});

describe('findReservedClassNames・displayWidth', () => {
  it('Jq で始まるクラス名を見つける（コメント・文字列は無視）', () => {
    expect(
      findReservedClassNames('record JqPos(int x) {}\n// class JqA\nString s = "class JqB";'),
    ).toEqual(['JqPos']);
  });

  it('全角は2桁、タブは4桁', () => {
    expect(displayWidth('#勇者\t')).toBe(9);
  });
});

describe('loadContent', () => {
  let dir: string | null = null;
  const copy = () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'jq-content-'));
    cpSync(GOOD, dir, { recursive: true });
    return dir;
  };
  const write = (rel: string, text: string) =>
    writeFileSync(path.join(dir as string, rel), text, 'utf8');
  const messages = (root: string) => loadContent(root).issues.map((i) => `${i.file}: ${i.message}`);

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  it('見本の教材にはエラーが無い', () => {
    const c = loadContent(GOOD);
    expect(c.issues).toEqual([]);
    expect(c.problems.map((p) => p.front.id)).toContain('ch00.sample-draw');
    const draw = c.problems.find((p) => p.front.id === 'ch00.sample-draw');
    expect(draw?.wrong.map((w) => w.expect?.kind)).toEqual(['exception', 'timeout']);
  });

  it('wrong の1行目の宣言が無い', () => {
    const root = copy();
    write('ch00/sample-fill/wrong/OneLine.java', 'void main() {}\n');
    expect(messages(root)).toContainEqual(
      expect.stringMatching(/wrong\/OneLine\.java: 1行目に期待する落ち方/),
    );
  });

  it('見出しが足りない・使えない見出し', () => {
    const root = copy();
    const md = path.join(root, 'ch00/sample-fix/problem.md');
    const text = readFileSync(md, 'utf8');
    write('ch00/sample-fix/problem.md', text.replace('## ヒント3', '## おまけ'));
    const m = messages(root);
    expect(m).toContainEqual(expect.stringMatching(/「## おまけ」は fix では使えない/));
    expect(m).toContainEqual(expect.stringMatching(/「## ヒント3」が無い/));
  });

  it('id とフォルダ・章の不一致、order の重複、part・concepts・dex の参照', () => {
    const root = copy();
    const md = path.join(root, 'ch00/sample-fill/problem.md');
    const text = readFileSync(md, 'utf8');
    write(
      'ch00/sample-fill/problem.md',
      text
        .replace('id: ch00.sample-fill', 'id: ch00.other')
        .replace('order: 40', 'order: 10')
        .replace('part: 1', 'part: 9')
        .replace('concepts: [println]', 'concepts: [unknown]'),
    );
    write(
      'ch00/sample-fill/wrong/NoSemicolon.java',
      '// expect: compile no-such-error\nvoid main() {}\n',
    );
    const m = messages(root);
    expect(m).toContainEqual(expect.stringMatching(/id は「ch00\.sample-fill」/));
    expect(m).toContainEqual(expect.stringMatching(/order: 10 が .* と重複/));
    expect(m).toContainEqual(expect.stringMatching(/part: 9 が course\.yaml/));
    expect(m).toContainEqual(expect.stringMatching(/「unknown」が concepts\.yaml に無い/));
    expect(m).toContainEqual(expect.stringMatching(/図鑑 ID「no-such-error」/));
  });

  it('expected が無いものは missing-expected の印を付ける', () => {
    const root = copy();
    rmSync(path.join(root, 'ch00/sample-fill/expected'), { recursive: true });
    const issues = loadContent(root).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('missing-expected');
  });

  it('wrong の数・Solution が無い・predict の選択肢の正解が2つ', () => {
    const root = copy();
    rmSync(path.join(root, 'ch00/sample-fill/wrong/OneLine.java'));
    rmSync(path.join(root, 'ch00/sample-fix/Solution.java'));
    const md = path.join(root, 'ch00/sample-choice/problem.md');
    const text = readFileSync(md, 'utf8');
    write('ch00/sample-choice/problem.md', text.replace('"A\\nB\\n"', '"ＡＢ"'));
    const m = messages(root);
    expect(m).toContainEqual(expect.stringMatching(/wrong\/\*\.java が2つ以上必要/));
    expect(m).toContainEqual(expect.stringMatching(/Solution\.java が無い/));
    expect(m).toContainEqual(expect.stringMatching(/一致する選択肢が2つ/));
  });

  it('Jq で始まるクラス名・タイルの大きさ', () => {
    const root = copy();
    write('ch00/sample-fill/Solution.java', 'record JqX() {}\nvoid main() {}\n');
    write('ch00/sample-draw/expected/1.txt', `${'#'.repeat(81)}\n`);
    const m = messages(root);
    expect(m).toContainEqual(expect.stringMatching(/「JqX」: Jq で始まる名前は判定用に予約/));
    expect(m).toContainEqual(expect.stringMatching(/80桁×40行）を超える/));
  });

  it('course.yaml が無い・YAML が壊れている', () => {
    const root = copy();
    rmSync(path.join(root, 'course.yaml'));
    write('concepts.yaml', '- [');
    const m = messages(root);
    expect(m).toContainEqual('course.yaml: ファイルが無い');
    expect(m).toContainEqual(expect.stringMatching(/^concepts\.yaml: YAML として読めない/));
  });
});
