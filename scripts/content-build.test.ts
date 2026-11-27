import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { GeneratedChapterContent, GeneratedCourse } from '../src/content/schema.ts';
import { buildJavaManifest, runBuild } from './content-build.ts';
import { ROOT } from './lib/paths.ts';

const GOOD = path.join(ROOT, 'tests', 'content-fixtures', 'good');
let tmp: string | null = null;

function build(all: boolean) {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'jq-build-'));
  const outDir = path.join(tmp, 'generated');
  const publicDir = path.join(tmp, 'public');
  const result = runBuild({ contentDir: GOOD, outDir, publicDir, all });
  const read = <T>(name: string) => JSON.parse(readFileSync(path.join(outDir, name), 'utf8')) as T;
  return { result, outDir, publicDir, read };
}

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

describe('content-build', () => {
  it('公開するもの（reviewed: true）だけを、部品 → order の順に出す', () => {
    const { result, read } = build(false);
    expect(result.issues).toEqual([]);
    const course = read<GeneratedCourse>('course.json');
    expect(course.version).toBe('2026.01.01-1');
    expect(course.chapters.map((c) => c.id)).toEqual(['ch00', 'ch01']);
    expect(course.chapters[0].steps.map((s) => s.id)).toEqual([
      'ch00.sample-card',
      'ch00.sample-predict',
      'ch00.sample-fill',
      'ch00.sample-fix',
      'ch00.sample-draw',
      'ch00.sample-quiz',
    ]);
    expect(course.errors.map((e) => e.id)).toContain('semicolon-expected');
    expect(course.concepts).toHaveLength(2);
  });

  it('--all なら reviewed: false も含める', () => {
    const { read } = build(true);
    const course = read<GeneratedCourse>('course.json');
    expect(course.chapters[0].steps.map((s) => s.id)).toContain('ch00.sample-choice');
    const ch00 = read<GeneratedChapterContent>('ch00.json');
    expect(ch00.steps.find((s) => s.id === 'ch00.sample-choice')?.answer).toBe(0);
  });

  it('章の中身: Solution・wrong・alt は入れない。Starter の印は行番号にする', () => {
    const { outDir, read } = build(false);
    const text = readFileSync(path.join(outDir, 'ch00.json'), 'utf8');
    expect(text).not.toContain('見本の村"'); // 穴埋めの模範解答（Solution.java）の中身
    expect(text).not.toContain('Solution');
    expect(text).not.toContain('DivideByZero');
    const ch00 = read<GeneratedChapterContent>('ch00.json');
    const draw = ch00.steps.find((s) => s.id === 'ch00.sample-draw');
    expect(draw?.starter?.writeLines).toEqual([3]);
    expect(draw?.starter?.folds).toEqual([{ from: 2, to: 2, label: '壁を描く（読むだけ）' }]);
    expect(draw?.starter?.code).not.toContain('//@');
    expect(draw?.judge?.cases[0]).toEqual({
      name: '部屋',
      stdin: '',
      expected: '#####\n#.@.#\n#####\n',
    });
    expect(draw?.body.hints).toHaveLength(3);
    const card = ch00.steps.find((s) => s.id === 'ch00.sample-card');
    expect(card).toMatchObject({
      example: expect.stringContaining('見本'),
      expectedOutput: '見本\n',
      judge: null,
    });
    const fix = ch00.steps.find((s) => s.id === 'ch00.sample-fix');
    expect(fix?.expectError).toEqual({ kind: 'compile', dex: 'unclosed-string', type: null });
    expect(read<GeneratedChapterContent>('ch01.json').steps).toEqual([]);
  });

  it('public/java/manifest.json に teavm-javac のファイルの大きさを書く', () => {
    const { publicDir } = build(false);
    expect(existsSync(path.join(publicDir, 'java', 'manifest.json'))).toBe(true);
    const manifest = buildJavaManifest(path.join(ROOT, 'public'));
    expect(manifest.teavm.sizes['compiler.wasm']).toBeGreaterThan(1_000_000);
    expect(Object.keys(manifest.teavm.sizes)).not.toContain('SHA256SUMS');
  });

  it('教材にエラーがあれば何も書かない', () => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'jq-build-'));
    const r = runBuild({
      contentDir: path.join(tmp, 'none'),
      outDir: path.join(tmp, 'out'),
      publicDir: path.join(tmp, 'pub'),
      all: false,
    });
    expect(r.output).toBeNull();
    expect(r.issues.length).toBeGreaterThan(0);
    expect(existsSync(path.join(tmp, 'out'))).toBe(false);
  });
});
