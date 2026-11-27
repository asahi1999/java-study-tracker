import { toJavaStringLiteral, toJavaStringOrNull } from './javaString.ts';
import type { JqStage, SourceFile, SourceKind } from './types.ts';
import { wrapCompact, type WrappedSource } from './wrap.ts';

// 判定に使うファイル一式を組み立てる（設計書 5-5）。ブラウザ（compile.worker）と content-verify（JDK・teavm）が使う。
// ハーネスの Java のソース（java/harness/ など）は、呼ぶ側が読んで渡す（ブラウザは ?raw、Node はファイル）。

export type HarnessSources = {
  /** java/harness/*.java と、java/harness-browser か java/harness-jdk の StdinBridge.java */
  files: SourceFile[];
};

export type CasesSpec = {
  step: string; // 判定の行に入れる問題 ID
  rev: number;
  source: SourceKind;
  stdin: string; // 「そのまま実行」の入力
  learnerFileNames: string[]; // スタックトレースで「学習者のファイル」とみなす名前（配るファイルも含める）
  stages: JqStage[];
};

export function generateJqCases(spec: CasesSpec): string {
  const stageOf: number[] = [];
  const names: string[] = [];
  const inputs: string[] = [];
  const expected: string[] = [];
  for (const stage of spec.stages) {
    for (const c of stage.cases) {
      stageOf.push(stage.n);
      names.push(toJavaStringLiteral(c.name));
      inputs.push(toJavaStringLiteral(c.stdin));
      expected.push(toJavaStringOrNull(c.expected));
    }
  }
  const stageCount = spec.stages.reduce((max, s) => Math.max(max, s.n), 0);
  const list = (items: string[]) =>
    items.length === 0 ? '{}' : `{\n        ${items.join(',\n        ')},\n    }`;
  return [
    '// content-build・JavaRunner が作る。手で直さない',
    'final class JqCases {',
    `    static final String STEP = ${toJavaStringLiteral(spec.step)};`,
    `    static final int REV = ${spec.rev};`,
    `    static final String SOURCE = ${toJavaStringLiteral(spec.source)};`,
    `    static final String STDIN = ${toJavaStringLiteral(spec.stdin)};`,
    `    static final String[] FILES = ${list(spec.learnerFileNames.map(toJavaStringLiteral))};`,
    `    static final int STAGES = ${stageCount};`,
    `    static final int[] CASE_STAGE = ${list(stageOf.map(String))};`,
    `    static final String[] CASE_NAME = ${list(names)};`,
    `    static final String[] CASE_STDIN = ${list(inputs)};`,
    `    static final String[] CASE_EXPECTED = ${list(expected)};`,
    '',
    '    // テスト関数（judge.mode: tests・both）はフェーズ2。{通った数, 全部の数}',
    '    static int[] tests(int stage) {',
    '        return new int[] {0, 0};',
    '    }',
    '}',
    '',
  ].join('\n');
}

export function generateJqEntry(source: SourceKind): string {
  const call = source === 'compact' ? 'new Main().main();' : 'Main.main(new String[0]);';
  return [
    '// content-build・JavaRunner が作る。手で直さない',
    'final class JqEntry {',
    '    static void run() throws Throwable {',
    `        ${call}`,
    '    }',
    '}',
    '',
  ].join('\n');
}

export type AssembleInput = {
  source: SourceKind;
  learnerFiles: SourceFile[]; // 学習者のファイル（Main.java）
  givenFiles: SourceFile[];
  cases: CasesSpec;
  harness: HarnessSources;
};

export type Assembled = {
  files: SourceFile[];
  /** 包んだファイル（compact のとき）。エラーの列を元に戻すのに使う */
  wrapped: Record<string, WrappedSource>;
};

/** 判定のクラスと JqCases・JqEntry を足して、コンパイルするファイル一式を作る */
export function assembleSources(input: AssembleInput): Assembled {
  const wrapped: Record<string, WrappedSource> = {};
  const learner = input.learnerFiles.map((f) => {
    if (input.source !== 'compact' || f.path !== 'Main.java') return f;
    const w = wrapCompact(f.content);
    wrapped[f.path] = w;
    return { path: f.path, content: w.source };
  });
  return {
    files: [
      ...learner,
      ...input.givenFiles,
      ...input.harness.files,
      { path: 'JqCases.java', content: generateJqCases(input.cases) },
      { path: 'JqEntry.java', content: generateJqEntry(input.source) },
    ],
    wrapped,
  };
}
