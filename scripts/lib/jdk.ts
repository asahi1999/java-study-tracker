// JDK（javac・java）で動かす（content-verify と、JDK を使うテスト）。
// 一時フォルダにファイルを書き、javac -encoding UTF-8 -d out → java -cp out JqRun（設計書 6-9）
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { SourceFile } from '../../src/domain/java/types.ts';
import type { RawDiagnostic } from '../../src/runtime/java/core/messages.ts';
import type { RawRun } from '../../src/runtime/java/core/result.ts';

export type JdkLang = 'en' | 'ja';

type ProcessResult = {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
  ms: number;
};

const MAX_CAPTURE = 4 * 1024 * 1024;

function runProcess(
  command: string,
  args: string[],
  options: { cwd: string; timeoutMs: number },
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn(command, args, { cwd: options.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let outSize = 0;
    let errSize = 0;
    let timedOut = false;
    child.stdout.on('data', (b: Buffer) => {
      if (outSize < MAX_CAPTURE) out.push(b);
      outSize += b.length;
    });
    child.stderr.on('data', (b: Buffer) => {
      if (errSize < MAX_CAPTURE) err.push(b);
      errSize += b.length;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs);
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
        code,
        timedOut,
        ms: performance.now() - started,
      });
    });
  });
}

const LANG_FLAGS: Record<JdkLang, string[]> = {
  en: ['-Duser.language=en', '-Duser.country=US'],
  ja: ['-Duser.language=ja', '-Duser.country=JP'],
};

/** javac のエラー出力（File.java:3: error: msg ＋ ソースの行 ＋ ^ の行）を読む */
export function parseJavacOutput(text: string): RawDiagnostic[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const result: RawDiagnostic[] = [];
  const header = /^(.+?\.java):(\d+): (error|warning|エラー|警告): (.*)$/;
  for (let i = 0; i < lines.length; i++) {
    const m = header.exec(lines[i]);
    if (!m) continue;
    // 続く行: ソースの行、^ の行、そのあと詳しい説明（symbol: など。teavm-javac はメッセージに含める）
    let column = 0;
    const details: string[] = [];
    let k = i + 1;
    for (; k < lines.length && !header.test(lines[k]); k++) {
      if (column === 0 && /^\s*\^\s*$/.test(lines[k])) {
        column = lines[k].indexOf('^') + 1;
      } else if (column > 0 && /^\s{2,}\S/.test(lines[k])) {
        details.push(lines[k]);
      } else if (column > 0) {
        break;
      }
    }
    result.push({
      file: path.basename(m[1]),
      line: Number(m[2]),
      column,
      severity: m[3] === 'warning' || m[3] === '警告' ? 'warning' : 'error',
      message: [m[4], ...details].join('\n'),
    });
    i = k - 1;
  }
  return result;
}

export type JdkCompileResult =
  | { ok: true; dir: string; cleanup: () => Promise<void> }
  | { ok: false; diagnostics: RawDiagnostic[]; output: string };

export async function compileWithJdk(
  files: SourceFile[],
  lang: JdkLang = 'en',
  timeoutMs = 60_000,
): Promise<JdkCompileResult> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'jq-jdk-'));
  const cleanup = () => rm(dir, { recursive: true, force: true });
  try {
    const src = path.join(dir, 'src');
    const out = path.join(dir, 'out');
    await mkdir(src, { recursive: true });
    for (const f of files) await writeFile(path.join(src, f.path), f.content, 'utf8');
    const args = [
      ...LANG_FLAGS[lang].map((f) => `-J${f}`),
      '-encoding',
      'UTF-8',
      '-g',
      '-nowarn',
      '-d',
      out,
      ...files.map((f) => path.join(src, f.path)),
    ];
    const r = await runProcess('javac', args, { cwd: dir, timeoutMs });
    if (r.code === 0) return { ok: true, dir: out, cleanup };
    await cleanup();
    const output = r.stderr + r.stdout;
    const diagnostics = parseJavacOutput(output);
    if (diagnostics.length === 0) throw new Error(`javac が失敗した: ${output.slice(0, 500)}`);
    return { ok: false, diagnostics, output };
  } catch (e) {
    await cleanup();
    throw e;
  }
}

export async function runWithJdk(
  classDir: string,
  timeoutMs: number,
  mainClass = 'JqRun',
): Promise<RawRun> {
  const args = [
    ...LANG_FLAGS.en,
    '-Dstdout.encoding=UTF-8',
    '-Dstderr.encoding=UTF-8',
    '-XX:+UseSerialGC',
    '-XX:TieredStopAtLevel=1',
    '-Xshare:auto',
    '-cp',
    classDir,
    mainClass,
  ];
  const r = await runProcess('java', args, { cwd: classDir, timeoutMs });
  const end: RawRun['end'] = r.timedOut ? { kind: 'timeout' } : { kind: 'exit', code: r.code ?? 1 };
  return { stdout: r.stdout, stderr: r.stderr, end, ms: r.ms };
}
