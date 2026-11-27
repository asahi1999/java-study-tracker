// src/runtime/java/core を本物の teavm-javac（Node）と JDK で動かす（設計書 14章「Java 実行の中心」）
import { describe, expect, it } from 'vitest';

import casesVectors from '../../java/test-vectors/cases.json';
import wrapVectors from '../../java/test-vectors/wrap.json';
import { assembleJob } from '../../src/runtime/java/core/assemble.ts';
import { buildRunResult, mapDiagnostics } from '../../src/runtime/java/core/result.ts';
import type { RunJob, RunResult } from '../../src/runtime/java/JavaRunner.ts';
import { loadHarness } from './harness-files.ts';
import { compileWithJdk, runWithJdk } from './jdk.ts';
import { compileWithTeavm, runWasmInWorker } from './teavm-node.ts';

const harness = loadHarness('browser');

function job(code: string, patch: Partial<RunJob> = {}): RunJob {
  return {
    stepId: 'test.core',
    rev: 1,
    source: 'compact',
    learnerFiles: [{ path: 'Main.java', content: code }],
    givenFiles: [],
    testsJava: null,
    stdin: '',
    stages: [{ n: 1, cases: [{ name: 'ケース', stdin: '', expected: '###\n' }] }],
    timeoutMs: 3000,
    ...patch,
  };
}

/** teavm-javac でコンパイルして Worker スレッドで動かす。compiler.wasm は毎回読み込み直す */
async function runTeavm(j: RunJob): Promise<RunResult & { stderrRaw?: string }> {
  const assembled = assembleJob(j, harness);
  const compiled = await compileWithTeavm(assembled.files);
  if (!compiled.ok) {
    return {
      kind: 'compile-error',
      diagnostics: mapDiagnostics(compiled.diagnostics, assembled, assembled.origins),
    };
  }
  const raw = await runWasmInWorker(compiled.wasm, j.timeoutMs);
  return { ...buildRunResult(raw, j.timeoutMs), stderrRaw: raw.stderr };
}

describe('teavm-javac（Node）', () => {
  it('Hello: 日本語と絵文字の出力、判定の結果', async () => {
    const r = await runTeavm(
      job('void main() {\n    System.out.println("###");\n    System.err.println("勇者😀");\n}\n'),
    );
    expect(r).toMatchObject({
      kind: 'judged',
      passed: 1,
      total: 1,
      displayOutput: '###\n',
      stderr: '勇者😀\n勇者😀\n',
    }); // そのまま実行とケース1で2回動く
  });

  it('判定の行の前に必ず改行を書く（出力が改行で終わらなくても行の頭から始まる）', async () => {
    const r = await runTeavm(
      job('void main() {\n    System.err.print("no-newline");\n    System.out.print("###");\n}\n'),
    );
    expect(r.stderrRaw).toContain('no-newline\n\u001e@@jq {"t":"case"');
    expect(r).toMatchObject({ kind: 'judged', passed: 1, stderr: 'no-newlineno-newline' }); // 判定の行と前の改行だけを除く
  });

  it('コンパイルエラーの行と列（外枠の分を戻す）', async () => {
    const r = await runTeavm(job('void main() {\n    System.out.println("a")\n}\n'));
    expect(r).toEqual({
      kind: 'compile-error',
      diagnostics: [
        {
          file: 'Main.java',
          line: 2,
          column: 28,
          severity: 'error',
          message: "';' expected",
          origin: 'learner',
        },
      ],
    });
  });

  it('import がある1行目のエラーの列', async () => {
    const r = await runTeavm(job('import java.util.List; int x = "a";\nvoid main() {}\n'));
    expect(r.kind).toBe('compile-error');
    if (r.kind === 'compile-error') {
      expect(r.diagnostics[0]).toMatchObject({
        line: 1,
        column: 32,
        message: expect.stringMatching(/^incompatible types/),
      });
    }
  });

  it('例外の型と、学習者のファイルの行', async () => {
    const r = await runTeavm(
      job(
        'int div(int a) {\n    return 10 / a;\n}\nvoid main() {\n    System.out.println(div(0));\n}\n',
      ),
    );
    expect(r.kind).toBe('judged');
    if (r.kind === 'judged') {
      expect(r.stages[0].cases[0]).toMatchObject({
        ok: false,
        error: { type: 'java.lang.ArithmeticException', line: 2, file: 'Main.java' },
      });
      expect(r.stderr).toContain(
        'Exception in thread "main" java.lang.ArithmeticException\n\tat Main.div(Main.java:2)',
      );
      expect(r.stderr).not.toMatch(/org\.teavm|JqRun/);
    }
  });

  it('System.exit は exited-early（0）か crash（0 以外）', async () => {
    expect(
      await runTeavm(job('void main() {\n    System.out.print("bye");\n    System.exit(0);\n}\n')),
    ).toMatchObject({
      kind: 'exited-early',
      partialOutput: 'bye',
    });
    expect(await runTeavm(job('void main() {\n    System.exit(3);\n}\n'))).toMatchObject({
      kind: 'crash',
      error: { type: 'exit-code' },
    });
  });

  it('深すぎる再帰は StackOverflowError（JS の RangeError）', async () => {
    const r = await runTeavm(
      job(
        'int f(int n) {\n    return f(n + 1) + 1;\n}\nvoid main() {\n    System.out.println(f(0));\n}\n',
      ),
    );
    expect(r).toMatchObject({ kind: 'crash', error: { type: 'java.lang.StackOverflowError' } });
  });

  it('出力の上限で止める（ハーネスの limit）', async () => {
    const r = await runTeavm(
      job('void main() {\n    for (int i = 0; i < 100000; i++) System.out.println(i);\n}\n'),
    );
    expect(r.kind).toBe('output-limit');
    if (r.kind === 'output-limit')
      expect(r.partialOutput.split('\n').length).toBeLessThanOrEqual(201);
  });

  it('時間切れ: それまでの出力を返す', async () => {
    const r = await runTeavm(
      job('void main() {\n    System.out.println("before");\n    while (true) {\n    }\n}\n', {
        timeoutMs: 1000,
      }),
    );
    expect(r).toMatchObject({ kind: 'timeout', partialOutput: 'before\n', timeoutMs: 1000 });
  });
});

describe('JDK', () => {
  it('cases.json の文字列は、Java の文字列リテラルとして読むと元に戻る', async () => {
    const strings = casesVectors.strings;
    const lines = strings.map((s, i) => `        out.add(${s.javaLiteral}); // ${i}`);
    const java = [
      'import java.util.ArrayList;',
      'import java.util.List;',
      'public class Literals {',
      '    public static void main(String[] args) {',
      '        List<String> out = new ArrayList<>();',
      ...lines,
      '        StringBuilder sb = new StringBuilder();',
      '        for (String s : out) {',
      '            for (int i = 0; i < s.length(); i++) sb.append((int) s.charAt(i)).append(i + 1 < s.length() ? "," : "");',
      '            sb.append("\\n");',
      '        }',
      '        System.out.print(sb);',
      '    }',
      '}',
    ].join('\n');
    const compiled = await compileWithJdk([{ path: 'Literals.java', content: java }]);
    if (!compiled.ok) throw new Error(compiled.output);
    try {
      const raw = await runWithJdk(compiled.dir, 10_000, 'Literals');
      const got = raw.stdout.split('\n').slice(0, strings.length);
      const want = strings.map((s) =>
        Array.from({ length: s.value.length }, (_, k) => s.value.charCodeAt(k)).join(','),
      );
      expect(got).toEqual(want);
    } finally {
      await compiled.cleanup();
    }
  });

  it('wrap.json の包んだソースは JDK でコンパイルでき、判定のクラスから呼べる', async () => {
    const jdkHarness = loadHarness('jdk');
    for (const c of wrapVectors.cases) {
      const j = job(c.input, { stages: [] });
      const assembled = assembleJob(j, jdkHarness);
      expect(assembled.files[0].content).toBe(c.output);
      const compiled = await compileWithJdk(assembled.files);
      expect(compiled.ok, c.name).toBe(true);
      if (compiled.ok) {
        const r = buildRunResult(await runWithJdk(compiled.dir, 10_000), 10_000);
        expect(r.kind, c.name).toBe('judged');
        await compiled.cleanup();
      }
    }
  });
});
