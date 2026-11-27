// 教材のフォルダ（content/）を読み、スキーマと参照を検査する（設計書 6-8 の手順 1〜3・5）。
// content-build と content-verify の両方が使う。JDK は使わない。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';

import {
  type Concept,
  conceptsSchema,
  type Course,
  courseSchema,
  type ErrorEntry,
  errorsSchema,
  type ExpectKind,
  type Gift,
  giftsSchema,
  isWriteType,
  type ProblemFront,
  problemFrontSchema,
  type ProjectFront,
  projectFrontSchema,
  SECTION_NAMES,
  SECTION_RULES,
  type SectionName,
  SLUG_RE,
  type StarterContent,
} from '../../src/content/schema.ts';
import { maskCommentsAndStrings } from '../../src/domain/java/strip.ts';
import type { SourceFile } from '../../src/domain/java/types.ts';
import { samePredict } from '../../src/domain/judge/predict.ts';

export type Issue = {
  file: string; // content/ からの相対パス
  message: string;
  /** 一部の検査だけを飛ばすための印（content-verify --update は missing-expected を飛ばす） */
  code?: 'missing-expected';
};

export type ExpectDecl =
  | { kind: 'test' }
  | { kind: 'timeout' }
  | { kind: 'compile'; dex: string | null }
  | { kind: 'exception'; type: string };

export type JavaVariant = {
  name: string; // wrong/OffByOne.java なら 'OffByOne'
  file: string; // content/ からの相対パス
  content: string; // 1行目の宣言を取り除いたもの
  expect: ExpectDecl | null; // alt は null
};

export type LoadedProblem = {
  dir: string; // 絶対パス
  rel: string; // content/ からの相対パス（ch00/sign）
  front: ProblemFront;
  sections: Partial<Record<SectionName, string>>;
  starter: StarterContent | null;
  starterRaw: string | null;
  solution: string | null;
  tests: string | null;
  program: string | null;
  example: string | null;
  given: SourceFile[];
  wrong: JavaVariant[];
  alt: JavaVariant[];
  expected: Map<number, string>; // expected/<i>.txt
};

export type LoadedProject = {
  dir: string;
  rel: string;
  front: ProjectFront;
  stageBodies: Map<string, { body: string; hints: string[] }>;
  summary: string | null;
  starter: SourceFile[];
  solution: SourceFile[];
  given: SourceFile[];
  tests: string | null;
  expected: Map<string, string>; // 'walls-1' → 中身
};

export type LoadedContent = {
  root: string;
  course: Course | null;
  concepts: Concept[];
  errors: ErrorEntry[];
  gifts: Gift[];
  problems: LoadedProblem[];
  projects: LoadedProject[];
  issues: Issue[];
};

// ---------------------------------------------------------------------------
// 部品（純粋関数）

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => {
    const where = i.path.length > 0 ? i.path.join('.') : '(全体)';
    return `${where}: ${i.message}`;
  });
}

/** 先頭の --- で囲んだ YAML と本文に分ける */
export function splitFrontMatter(text: string): { front: string; body: string } | null {
  const normalized = text.replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalized);
  if (!m) return null;
  return { front: m[1], body: m[2] };
}

/** ## 見出しで本文を分ける。見出しの前に文があればエラー */
export function splitSections(body: string): {
  sections: { name: string; text: string }[];
  preamble: string;
} {
  const sections: { name: string; text: string }[] = [];
  const preamble: string[] = [];
  let current: { name: string; lines: string[] } | null = null;
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence ? /^##\s+(.+?)\s*$/.exec(line) : null;
    if (m) {
      if (current) sections.push({ name: current.name, text: current.lines.join('\n').trim() });
      current = { name: m[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) sections.push({ name: current.name, text: current.lines.join('\n').trim() });
  return { sections, preamble: preamble.join('\n').trim() };
}

/**
 * Starter の印（設計書 6-1）を取り除いて行番号にする。
 * - 行の末尾の //@write … 「書くのはここ」の行
 * - //@fold <説明> の行から //@end の行まで … 折りたたむ範囲（印の行そのものは消す）
 */
export function parseStarterMarks(raw: string): { starter: StarterContent; errors: string[] } {
  const errors: string[] = [];
  const out: string[] = [];
  const writeLines: number[] = [];
  const folds: StarterContent['folds'] = [];
  let open: { from: number; label: string; markLine: number } | null = null;
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  lines.forEach((line, idx) => {
    const fold = /^\s*\/\/@fold(?:\s+(.*))?$/.exec(line);
    if (fold) {
      if (open) errors.push(`${idx + 1}行目: //@fold の中に //@fold がある`);
      const label = (fold[1] ?? '').trim();
      if (label === '') errors.push(`${idx + 1}行目: //@fold に説明（1行）を書く`);
      open = { from: out.length + 1, label, markLine: idx + 1 };
      return;
    }
    if (/^\s*\/\/@end\s*$/.test(line)) {
      if (!open) {
        errors.push(`${idx + 1}行目: //@fold が無いのに //@end がある`);
      } else {
        if (out.length < open.from) errors.push(`${open.markLine}行目: //@fold の範囲が空`);
        else folds.push({ from: open.from, to: out.length, label: open.label });
        open = null;
      }
      return;
    }
    const write = /^(.*?)\s*\/\/@write\s*$/.exec(line);
    if (write) {
      out.push(write[1]);
      writeLines.push(out.length);
      return;
    }
    if (/\/\/@(write|fold|end)\b/.test(line)) {
      errors.push(
        `${idx + 1}行目: 印の書き方が違う（//@write は行の末尾、//@fold・//@end は1行に単独）`,
      );
    }
    out.push(line);
  });
  if (open)
    errors.push(`${(open as { markLine: number }).markLine}行目: //@fold が //@end で閉じていない`);
  return { starter: { code: out.join('\n'), writeLines, folds }, errors };
}

/** wrong/*.java の1行目の宣言（設計書 6-1）。宣言の行を取り除いた中身も返す */
export function parseExpectLine(
  text: string,
): { decl: ExpectDecl; content: string } | { error: string } {
  const normalized = text.replace(/\r\n/g, '\n');
  const nl = normalized.indexOf('\n');
  const first = (nl < 0 ? normalized : normalized.slice(0, nl)).trim();
  const content = nl < 0 ? '' : normalized.slice(nl + 1);
  const m = /^\/\/\s*expect:\s*(.*)$/.exec(first);
  if (!m) return { error: '1行目に期待する落ち方（// expect: ...）が無い' };
  const parts = m[1].trim().split(/\s+/);
  const kind = parts[0] as ExpectKind | '';
  switch (kind) {
    case 'test':
    case 'timeout':
      if (parts.length > 1) return { error: `// expect: ${kind} の後ろに何も書かない` };
      return { decl: { kind }, content };
    case 'compile':
      if (parts.length > 2) return { error: '// expect: compile [図鑑 ID]' };
      if (parts[1] && !SLUG_RE.test(parts[1])) return { error: `図鑑 ID の形が違う: ${parts[1]}` };
      return { decl: { kind: 'compile', dex: parts[1] ?? null }, content };
    case 'exception':
      if (parts.length !== 2 || !/^[\w$.]+$/.test(parts[1])) {
        return { error: '// expect: exception <例外の完全な型名>' };
      }
      return { decl: { kind: 'exception', type: parts[1] }, content };
    default:
      return { error: `知らない落ち方: ${m[1].trim()}（test・exception・compile・timeout）` };
  }
}

/** 教材のクラス名のうち Jq で始まるもの（判定用に予約。設計書 5-2） */
export function findReservedClassNames(java: string): string[] {
  const masked = maskCommentsAndStrings(java);
  const names: string[] = [];
  const re = /\b(?:class|record|interface|enum)\s+(Jq[\w$]*)/g;
  for (let m = re.exec(masked); m !== null; m = re.exec(masked)) names.push(m[1]);
  return names;
}

// ---------------------------------------------------------------------------
// 読み込み

function readText(file: string): string | null {
  return existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
}

function listFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext) && statSync(path.join(dir, f)).isFile())
    .sort();
}

function isDir(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}

export function loadContent(root: string): LoadedContent {
  const issues: Issue[] = [];
  const rel = (p: string) => path.relative(root, p).split(path.sep).join('/');
  if (!isDir(root)) {
    issues.push({ file: '.', message: `教材のフォルダが無い: ${root}` });
    return {
      root,
      course: null,
      concepts: [],
      errors: [],
      gifts: [],
      problems: [],
      projects: [],
      issues,
    };
  }

  function readYaml<T>(name: string, schema: z.ZodType<T>, fallback: T): T {
    const file = path.join(root, name);
    const text = readText(file);
    if (text === null) {
      issues.push({ file: name, message: 'ファイルが無い' });
      return fallback;
    }
    let data: unknown;
    try {
      data = parseYaml(text);
    } catch (e) {
      issues.push({ file: name, message: `YAML として読めない: ${(e as Error).message}` });
      return fallback;
    }
    const r = schema.safeParse(data ?? []);
    if (!r.success) {
      for (const m of formatZodIssues(r.error)) issues.push({ file: name, message: m });
      return fallback;
    }
    return r.data;
  }

  const courseFile = path.join(root, 'course.yaml');
  let course: Course | null = null;
  if (readText(courseFile) === null) {
    issues.push({ file: 'course.yaml', message: 'ファイルが無い' });
  } else {
    try {
      const r = courseSchema.safeParse(parseYaml(readText(courseFile) ?? ''));
      if (r.success) course = r.data;
      else
        for (const m of formatZodIssues(r.error)) issues.push({ file: 'course.yaml', message: m });
    } catch (e) {
      issues.push({ file: 'course.yaml', message: `YAML として読めない: ${(e as Error).message}` });
    }
  }
  const concepts = readYaml('concepts.yaml', conceptsSchema, []);
  const errors = readYaml('errors.yaml', errorsSchema, []);
  const gifts = readYaml('gifts.yaml', giftsSchema, []);

  // 一覧ごとの ID の重複
  const dup = (file: string, ids: (string | number)[], label: string) => {
    const seen = new Set<string | number>();
    for (const id of ids) {
      if (seen.has(id)) issues.push({ file, message: `${label}「${id}」が重複` });
      seen.add(id);
    }
  };
  dup(
    'concepts.yaml',
    concepts.map((c) => c.id),
    'id',
  );
  dup(
    'errors.yaml',
    errors.map((e) => e.id),
    'id',
  );
  dup(
    'errors.yaml',
    errors.map((e) => e.no),
    'no',
  );
  dup(
    'gifts.yaml',
    gifts.map((g) => g.id),
    'id',
  );

  // errors-fixtures
  for (const e of errors) {
    if (e.fixture && !existsSync(path.join(root, 'errors-fixtures', `${e.id}.java`))) {
      issues.push({
        file: 'errors.yaml',
        message: `${e.id}: fixture: true なのに errors-fixtures/${e.id}.java が無い`,
      });
    }
  }

  const problems: LoadedProblem[] = [];
  for (const chDir of readdirSync(root)
    .filter((d) => /^ch\d{2}$/.test(d))
    .sort()) {
    const chPath = path.join(root, chDir);
    if (!isDir(chPath)) continue;
    for (const slug of readdirSync(chPath).sort()) {
      const dir = path.join(chPath, slug);
      if (!isDir(dir)) continue;
      const p = loadProblem(dir, chDir, slug, rel, issues);
      if (p) problems.push(p);
    }
  }

  const projects: LoadedProject[] = [];
  const projRoot = path.join(root, 'projects');
  if (isDir(projRoot)) {
    for (const id of readdirSync(projRoot).sort()) {
      const dir = path.join(projRoot, id);
      if (!isDir(dir)) continue;
      const p = loadProject(dir, id, rel, issues);
      if (p) projects.push(p);
    }
  }

  const content: LoadedContent = {
    root,
    course,
    concepts,
    errors,
    gifts,
    problems,
    projects,
    issues,
  };
  checkReferences(content);
  return content;
}

function loadProblem(
  dir: string,
  chDir: string,
  slug: string,
  rel: (p: string) => string,
  issues: Issue[],
): LoadedProblem | null {
  const r = rel(dir);
  const at = (name: string) => `${r}/${name}`;
  if (!SLUG_RE.test(slug)) issues.push({ file: r, message: 'フォルダ名は英小文字・数字・- だけ' });
  const md = readText(path.join(dir, 'problem.md'));
  if (md === null) {
    issues.push({ file: r, message: 'problem.md が無い' });
    return null;
  }
  const split = splitFrontMatter(md);
  if (!split) {
    issues.push({ file: at('problem.md'), message: '先頭に --- で囲んだ前書き（YAML）が無い' });
    return null;
  }
  let data: unknown;
  try {
    data = parseYaml(split.front);
  } catch (e) {
    issues.push({
      file: at('problem.md'),
      message: `前書きが YAML として読めない: ${(e as Error).message}`,
    });
    return null;
  }
  const parsed = problemFrontSchema.safeParse(data);
  if (!parsed.success) {
    for (const m of formatZodIssues(parsed.error))
      issues.push({ file: at('problem.md'), message: m });
    return null;
  }
  const front = parsed.data;
  if (front.id !== `${chDir}.${slug}`) {
    issues.push({
      file: at('problem.md'),
      message: `id は「${chDir}.${slug}」（フォルダと一致させる）`,
    });
  }
  if (`ch${String(front.chapter).padStart(2, '0')}` !== chDir) {
    issues.push({
      file: at('problem.md'),
      message: `chapter: ${front.chapter} がフォルダ ${chDir} と合わない`,
    });
  }

  // 本文
  const { sections, preamble } = splitSections(split.body);
  if (preamble !== '')
    issues.push({ file: at('problem.md'), message: '最初の ## 見出しの前に文がある' });
  const rule = SECTION_RULES[front.type];
  const allowed = new Set<string>([...rule.required, ...rule.optional]);
  const found: Partial<Record<SectionName, string>> = {};
  for (const s of sections) {
    if (!(SECTION_NAMES as readonly string[]).includes(s.name) || !allowed.has(s.name)) {
      issues.push({
        file: at('problem.md'),
        message: `見出し「## ${s.name}」は ${front.type} では使えない`,
      });
      continue;
    }
    const name = s.name as SectionName;
    if (found[name] !== undefined)
      issues.push({ file: at('problem.md'), message: `見出し「## ${name}」が重複` });
    if (s.text === '') issues.push({ file: at('problem.md'), message: `「## ${name}」が空` });
    found[name] = s.text;
  }
  for (const name of rule.required) {
    if (found[name] === undefined)
      issues.push({ file: at('problem.md'), message: `見出し「## ${name}」が無い` });
  }
  if (isWriteType(front.type) && found['解説'] !== undefined) {
    const lines = found['解説'].split('\n').filter((l) => l.trim() !== '').length;
    if (lines < 2 || lines > 5) {
      issues.push({ file: at('problem.md'), message: `「## 解説」は2〜5行（今は${lines}行）` });
    }
  }

  // ファイル
  const javaFile = (name: string) => readText(path.join(dir, name));
  const starterRaw = javaFile('Starter.java');
  let starter: StarterContent | null = null;
  if (starterRaw !== null) {
    const marks = parseStarterMarks(starterRaw);
    starter = marks.starter;
    for (const e of marks.errors) issues.push({ file: at('Starter.java'), message: e });
  }
  const solution = javaFile('Solution.java');
  const tests = javaFile('Tests.java');
  const program = javaFile('Program.java');
  const example = javaFile('Example.java');
  const given = listFiles(path.join(dir, 'given'), '.java').map((f) => ({
    path: f,
    content: readText(path.join(dir, 'given', f)) ?? '',
  }));
  const readVariants = (sub: 'wrong' | 'alt'): JavaVariant[] =>
    listFiles(path.join(dir, sub), '.java').map((f) => {
      const text = readText(path.join(dir, sub, f)) ?? '';
      const file = at(`${sub}/${f}`);
      const name = f.replace(/\.java$/, '');
      if (sub === 'alt') return { name, file, content: text, expect: null };
      const e = parseExpectLine(text);
      if ('error' in e) {
        issues.push({ file, message: e.error });
        return { name, file, content: text, expect: null };
      }
      return { name, file, content: e.content, expect: e.decl };
    });
  const wrong = readVariants('wrong');
  const alt = readVariants('alt');
  const expected = new Map<number, string>();
  for (const f of listFiles(path.join(dir, 'expected'), '.txt')) {
    const m = /^(\d+)\.txt$/.exec(f);
    if (!m) {
      issues.push({ file: at(`expected/${f}`), message: '名前は <番号>.txt' });
      continue;
    }
    expected.set(Number(m[1]), readText(path.join(dir, 'expected', f)) ?? '');
  }

  // 種類ごとの必要なファイル（設計書 6-1 の表）
  const need = (ok: boolean, message: string) => {
    if (!ok) issues.push({ file: r, message });
  };
  const forbid = (value: unknown, name: string) => {
    if (value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)) {
      issues.push({ file: r, message: `${name} は ${front.type} では使わない` });
    }
  };
  const t = front.type;
  if (isWriteType(t)) {
    need(starterRaw !== null, 'Starter.java が無い');
    need(solution !== null, 'Solution.java が無い');
    const min = t === 'fix' ? 1 : 2;
    need(wrong.length >= min, `wrong/*.java が${min}つ以上必要（今は${wrong.length}つ）`);
    const mode = front.judge?.mode;
    need(
      mode !== 'tests' && mode !== 'both' ? true : tests !== null,
      'Tests.java が無い（mode: tests・both）',
    );
    if (mode === 'output') forbid(tests, 'Tests.java');
    forbid(program, 'Program.java');
    forbid(example, 'Example.java');
    const cases = front.judge?.cases ?? [];
    cases.forEach((_, i) => {
      if (!expected.has(i + 1)) {
        issues.push({
          file: r,
          message: `expected/${i + 1}.txt が無い（npm run content:verify -- --only ${front.id} --update で作る）`,
          code: 'missing-expected',
        });
      }
    });
    for (const n of expected.keys()) {
      if (n < 1 || n > cases.length)
        issues.push({ file: at(`expected/${n}.txt`), message: '対応するケースが無い' });
    }
  } else {
    forbid(starterRaw, 'Starter.java');
    forbid(tests, 'Tests.java');
    forbid(wrong, 'wrong/');
    forbid(alt, 'alt/');
    forbid(given, 'given/');
    if (t !== 'parsons') forbid(solution, 'Solution.java');
    if (t !== 'predict') forbid(program, 'Program.java');
    if (t !== 'card') forbid(example, 'Example.java');
    if (t === 'predict') need(program !== null, 'Program.java が無い');
    if (t === 'parsons') need(solution !== null, 'Solution.java が無い');
    const needsOutput = t === 'predict' || (t === 'card' && example !== null);
    if (needsOutput && !expected.has(0)) {
      issues.push({
        file: r,
        message: `expected/0.txt が無い（npm run content:verify -- --only ${front.id} --update で作る）`,
        code: 'missing-expected',
      });
    }
    for (const n of expected.keys()) {
      if (!(needsOutput && n === 0))
        issues.push({ file: at(`expected/${n}.txt`), message: '使わないファイル' });
    }
    if (t === 'card' && example !== null && !front.source) {
      issues.push({ file: at('problem.md'), message: 'Example.java があるときは source が必須' });
    }
  }

  // predict の選択肢: expected/0.txt と一致するものがちょうど1つ（設計書 6-9）
  if (t === 'predict' && front.inputMode === 'choice' && front.choices && expected.has(0)) {
    const output = expected.get(0) ?? '';
    const hits = front.choices.filter((ch) => samePredict(output, ch)).length;
    if (hits !== 1) {
      issues.push({
        file: at('problem.md'),
        message: `expected/0.txt と一致する選択肢が${hits}つ（ちょうど1つにする）`,
      });
    }
  }

  // Jq で始まるクラス名は判定用に予約（設計書 5-2）
  const learnerJava: [string, string | null][] = [
    ['Starter.java', starterRaw],
    ['Solution.java', solution],
    ['Program.java', program],
    ['Example.java', example],
    ...given.map((g): [string, string] => [`given/${g.path}`, g.content]),
    ...alt.map((a): [string, string] => [`alt/${a.name}.java`, a.content]),
  ];
  for (const [name, code] of learnerJava) {
    if (code === null) continue;
    for (const cls of findReservedClassNames(code)) {
      issues.push({ file: at(name), message: `クラス名「${cls}」: Jq で始まる名前は判定用に予約` });
    }
  }

  // draw の目標の絵と「そのまま実行」の入力（設計書 5-3・6-9）
  if (t === 'draw') {
    const first = front.judge?.cases?.[0];
    if (first && first.stdin !== front.stdin) {
      issues.push({
        file: at('problem.md'),
        message: '絵の問題では、最初のケースの stdin を前書きの stdin と同じにする',
      });
    }
  }
  if (front.render === 'tiles') {
    for (const [n, text] of expected) {
      const rows = text.replace(/\n$/, '').split('\n');
      const width = Math.max(0, ...rows.map((row) => displayWidth(row)));
      if (rows.length > 40 || width > 80) {
        issues.push({
          file: at(`expected/${n}.txt`),
          message: `タイルにできる大きさ（80桁×40行）を超える（${width}桁×${rows.length}行）`,
        });
      }
    }
  }

  return {
    dir,
    rel: r,
    front,
    sections: found,
    starter,
    starterRaw,
    solution,
    tests,
    program,
    example,
    given,
    wrong,
    alt,
    expected,
  };
}

/** 全角（East Asian Width の F・W）は2桁、タブは4桁（設計書 8-1 の簡易版） */
export function displayWidth(line: string): number {
  let w = 0;
  for (const ch of line) {
    if (ch === '\t') w += 4;
    else if (
      /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|[\u{1f300}-\u{1faff}\u{20000}-\u{3fffd}]/u.test(
        ch,
      )
    )
      w += 2;
    else w += 1;
  }
  return w;
}

function loadProject(
  dir: string,
  id: string,
  rel: (p: string) => string,
  issues: Issue[],
): LoadedProject | null {
  const r = rel(dir);
  const md = readText(path.join(dir, 'project.md'));
  if (md === null) {
    issues.push({ file: r, message: 'project.md が無い' });
    return null;
  }
  const split = splitFrontMatter(md);
  if (!split) {
    issues.push({ file: `${r}/project.md`, message: '先頭に --- で囲んだ前書き（YAML）が無い' });
    return null;
  }
  let data: unknown;
  try {
    data = parseYaml(split.front);
  } catch (e) {
    issues.push({
      file: `${r}/project.md`,
      message: `前書きが YAML として読めない: ${(e as Error).message}`,
    });
    return null;
  }
  const parsed = projectFrontSchema.safeParse(data);
  if (!parsed.success) {
    for (const m of formatZodIssues(parsed.error))
      issues.push({ file: `${r}/project.md`, message: m });
    return null;
  }
  const front = parsed.data;
  if (front.id !== id)
    issues.push({ file: `${r}/project.md`, message: `id は「${id}」（フォルダと一致させる）` });

  const { sections, preamble } = splitSections(split.body);
  if (preamble !== '')
    issues.push({ file: `${r}/project.md`, message: '最初の ## 見出しの前に文がある' });
  const stageBodies = new Map<string, { body: string; hints: string[] }>();
  let summary: string | null = null;
  const known = new Set<string>();
  for (const s of front.stages) {
    const body = sections.find((x) => x.name === `段階${s.n}`);
    if (!body) issues.push({ file: `${r}/project.md`, message: `見出し「## 段階${s.n}」が無い` });
    const hints: string[] = [];
    for (let h = 1; h <= 3; h++) {
      const hint = sections.find((x) => x.name === `段階${s.n} ヒント${h}`);
      if (!hint)
        issues.push({
          file: `${r}/project.md`,
          message: `見出し「## 段階${s.n} ヒント${h}」が無い`,
        });
      else hints.push(hint.text);
      known.add(`段階${s.n} ヒント${h}`);
    }
    known.add(`段階${s.n}`);
    stageBodies.set(s.id, { body: body?.text ?? '', hints });
  }
  for (const s of sections) {
    if (s.name === 'まとめ') summary = s.text;
    else if (!known.has(s.name))
      issues.push({ file: `${r}/project.md`, message: `見出し「## ${s.name}」は使えない` });
  }

  const readDir = (sub: string): SourceFile[] =>
    listFiles(path.join(dir, sub), '.java').map((f) => ({
      path: f,
      content: readText(path.join(dir, sub, f)) ?? '',
    }));
  const starter = readDir('starter');
  const solution = readDir('solution');
  const given = readDir('given');
  for (const f of front.learnerFiles) {
    if (!starter.some((s) => s.path === f))
      issues.push({ file: r, message: `starter/${f} が無い` });
    if (!solution.some((s) => s.path === f))
      issues.push({ file: r, message: `solution/${f} が無い` });
  }
  const tests = readText(path.join(dir, 'Tests.java'));
  if (front.stages.some((s) => s.mode !== 'output') && tests === null) {
    issues.push({ file: r, message: 'Tests.java が無い（mode: tests・both の段階がある）' });
  }
  const expected = new Map<string, string>();
  for (const f of listFiles(path.join(dir, 'expected'), '.txt')) {
    expected.set(f.replace(/\.txt$/, ''), readText(path.join(dir, 'expected', f)) ?? '');
  }
  for (const s of front.stages) {
    s.cases.forEach((_, i) => {
      if (!expected.has(`${s.id}-${i + 1}`)) {
        issues.push({
          file: r,
          message: `expected/${s.id}-${i + 1}.txt が無い`,
          code: 'missing-expected',
        });
      }
    });
  }
  return { dir, rel: r, front, stageBodies, summary, starter, solution, given, tests, expected };
}

/** 参照の検査（設計書 6-8 の手順 3） */
function checkReferences(c: LoadedContent): void {
  const conceptIds = new Set(c.concepts.map((x) => x.id));
  const errorIds = new Set(c.errors.map((x) => x.id));
  const seenIds = new Map<string, string>();
  const orders = new Map<string, string>();
  for (const p of c.problems) {
    const file = `${p.rel}/problem.md`;
    const f = p.front;
    const prev = seenIds.get(f.id);
    if (prev) c.issues.push({ file, message: `id「${f.id}」が ${prev} と重複` });
    seenIds.set(f.id, p.rel);
    const orderKey = `${f.chapter}:${f.order}`;
    const prevOrder = orders.get(orderKey);
    if (prevOrder) c.issues.push({ file, message: `order: ${f.order} が ${prevOrder} と重複` });
    orders.set(orderKey, p.rel);

    if (c.course) {
      const ch = c.course.chapters.find((x) => x.number === f.chapter);
      if (!ch) c.issues.push({ file, message: `第${f.chapter}章が course.yaml に無い` });
      else if (!ch.parts.some((x) => x.n === f.part)) {
        c.issues.push({
          file,
          message: `part: ${f.part} が course.yaml の ${ch.id} の parts に無い`,
        });
      }
    }
    for (const id of f.concepts ?? []) {
      if (!conceptIds.has(id))
        c.issues.push({ file, message: `concepts の「${id}」が concepts.yaml に無い` });
    }
    if (f.expectError?.dex && !errorIds.has(f.expectError.dex)) {
      c.issues.push({
        file,
        message: `expectError.dex の「${f.expectError.dex}」が errors.yaml に無い`,
      });
    }
    for (const w of p.wrong) {
      if (w.expect?.kind === 'compile' && w.expect.dex && !errorIds.has(w.expect.dex)) {
        c.issues.push({ file: w.file, message: `図鑑 ID「${w.expect.dex}」が errors.yaml に無い` });
      }
    }
  }
  if (c.course) {
    const projectIds = new Set(c.projects.map((p) => p.front.id));
    for (const ch of c.course.chapters) {
      if (ch.project && !projectIds.has(ch.project) && c.projects.length > 0) {
        c.issues.push({
          file: 'course.yaml',
          message: `${ch.id}: project「${ch.project}」が projects/ に無い`,
        });
      }
    }
    for (const p of c.projects) {
      if (!c.course.chapters.some((ch) => ch.number === p.front.chapter)) {
        c.issues.push({
          file: `${p.rel}/project.md`,
          message: `第${p.front.chapter}章が course.yaml に無い`,
        });
      }
    }
  }
}
