// public/java/ の同梱ファイルを SHA256SUMS と照合する（npm run teavm:verify）。
// SHA256SUMS に無いファイル（.md と SHA256SUMS 自身を除く）があっても失敗にする
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type VerifyProblem = { dir: string; file: string; reason: string };

export function parseSums(text: string): Map<string, string> {
  const sums = new Map<string, string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(trimmed);
    if (!m) throw new Error(`SHA256SUMS の行の形が違う: ${trimmed}`);
    sums.set(m[2], m[1]);
  }
  return sums;
}

export function verifyDir(dir: string): VerifyProblem[] {
  const problems: VerifyProblem[] = [];
  const sumsPath = path.join(dir, 'SHA256SUMS');
  if (!existsSync(sumsPath)) return [{ dir, file: 'SHA256SUMS', reason: 'SHA256SUMS が無い' }];
  const sums = parseSums(readFileSync(sumsPath, 'utf8'));
  for (const [file, expected] of sums) {
    const full = path.join(dir, file);
    if (!existsSync(full)) {
      problems.push({ dir, file, reason: 'ファイルが無い' });
      continue;
    }
    const actual = createHash('sha256').update(readFileSync(full)).digest('hex');
    if (actual !== expected) problems.push({ dir, file, reason: `ハッシュが違う（${actual}）` });
  }
  for (const file of readdirSync(dir)) {
    if (file === 'SHA256SUMS' || file.endsWith('.md')) continue;
    if (!statSync(path.join(dir, file)).isFile()) continue;
    if (!sums.has(file)) problems.push({ dir, file, reason: 'SHA256SUMS に載っていない' });
  }
  return problems;
}

/** public/java/<種類>/<版>/ のフォルダを全部集める */
export function findBundleDirs(javaRoot: string): string[] {
  const dirs: string[] = [];
  for (const kind of ['teavm-javac', 'jq-shim']) {
    const base = path.join(javaRoot, kind);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base)) {
      const full = path.join(base, name);
      if (statSync(full).isDirectory()) dirs.push(full);
    }
  }
  return dirs;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const javaRoot = path.join(root, 'public', 'java');
  const dirs = findBundleDirs(javaRoot);
  if (dirs.length === 0) {
    console.error('public/java/ に同梱のフォルダが見つからない');
    process.exit(1);
  }
  let failed = false;
  for (const dir of dirs) {
    const rel = path.relative(root, dir);
    const problems = verifyDir(dir);
    if (problems.length === 0) {
      console.log(`OK  ${rel}`);
    } else {
      failed = true;
      for (const p of problems) console.error(`NG  ${rel}/${p.file}: ${p.reason}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
