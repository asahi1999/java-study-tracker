// teavm-javac で Java のソースを app.wasm にする（compile.worker と、Node の content-verify・テストが使う）。
// 毎回 createCompiler() で新しい Compiler を作る（設計書 4-2）。

import type { SourceFile } from '../../../domain/java/types.ts';
import type { RawDiagnostic } from './messages.ts';
import type { TeavmCompilerModule, TeavmDiagnostic } from './teavmApi.ts';

export type CompileLibs = {
  sdk: Int8Array; // compile-classlib-teavm.bin（javac が見る型の情報）
  classlib: Int8Array; // runtime-classlib-teavm.bin（TeaVM の標準ライブラリ）
  shimClasses: Record<string, Int8Array> | null; // 'java/util/Scanner.class' → バイト列（フェーズ2）
};

export type CompileOutcome =
  | { ok: true; wasm: Int8Array; javacMs: number; teavmMs: number }
  | { ok: false; diagnostics: RawDiagnostic[] };

export class CompilerInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompilerInternalError';
  }
}

export function toRawDiagnostic(d: TeavmDiagnostic): RawDiagnostic {
  return {
    file: d.fileName ?? '',
    line: d.lineNumber > 0 ? d.lineNumber : 0,
    column: d.columnNumber > 0 ? d.columnNumber : 0,
    severity: d.severity === 'warning' ? 'warning' : 'error',
    message: d.message,
  };
}

export async function compileSources(
  module: TeavmCompilerModule,
  libs: CompileLibs,
  files: SourceFile[],
  mainClass: string,
  now: () => number = () => performance.now(),
): Promise<CompileOutcome> {
  const compiler = module.exports.createCompiler();
  compiler.setSdk(libs.sdk);
  compiler.setTeaVMClasslib(libs.classlib);
  if (libs.shimClasses) {
    for (const [path, bytes] of Object.entries(libs.shimClasses))
      compiler.addClassFile(path, bytes);
  }
  const diagnostics: RawDiagnostic[] = [];
  compiler.onDiagnostic((d) => diagnostics.push(toRawDiagnostic(d)));
  for (const f of files) compiler.addSourceFile(f.path, f.content);

  const t0 = now();
  const compiled = compiler.compile();
  const t1 = now();
  if (!compiled) return failed(diagnostics, 'javac が失敗した（エラーの報告なし）');

  const generated = await compiler.generateWebAssembly({
    outputName: 'app',
    mainClass,
    obfuscated: false,
  });
  const t2 = now();
  if (!generated) return failed(diagnostics, 'TeaVM が失敗した（エラーの報告なし）');
  const wasm = compiler.getWebAssemblyOutputFile('app.wasm');
  return { ok: true, wasm, javacMs: t1 - t0, teavmMs: t2 - t1 };
}

function failed(diagnostics: RawDiagnostic[], fallback: string): CompileOutcome {
  const errors = diagnostics.filter((d) => d.severity === 'error');
  if (errors.length === 0) throw new CompilerInternalError(fallback);
  return { ok: false, diagnostics };
}

/** Int8Array の中身だけを持つ ArrayBuffer にする（Worker へ transfer するため） */
export function toArrayBuffer(bytes: Int8Array | Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return copy.buffer;
}
