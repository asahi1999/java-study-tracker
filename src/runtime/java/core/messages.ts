// Worker とメインスレッドの間のメッセージの型（設計書 4-3）

import type { SourceFile } from '../../../domain/java/types.ts';

export type AssetUrls = {
  compilerWasm: string;
  runtimeJs: string;
  runtimeClasslib: string;
  compileClasslib: string;
  shimClasses: string | null; // フェーズ2（代わりの Scanner）。それまでは null
  deobfuscator: string;
};

// メインスレッド → compile.worker
export type CompileIn =
  | { type: 'init'; assets: AssetUrls; sizes: Record<string, number> }
  | { type: 'compile'; id: string; files: SourceFile[]; mainClass: 'JqRun' };

export type RawDiagnostic = {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string; // 英語（teavm-javac）
};

// compile.worker → メインスレッド
export type CompileOut =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; initMs: number }
  | { type: 'init-failed'; message: string }
  | { type: 'compiled'; id: string; wasm: ArrayBuffer; ms: { javac: number; teavm: number } }
  | { type: 'compile-error'; id: string; diagnostics: RawDiagnostic[] }
  | { type: 'internal-error'; id: string; message: string };

// メインスレッド → run.worker
export type RunIn = {
  type: 'run';
  id: string;
  wasm: ArrayBuffer;
  runtimeJs: string;
  deobfuscator: string;
};

export type CrashKind = 'stack-overflow' | 'out-of-memory' | 'unknown';

// run.worker → メインスレッド（出力は 50ms ごとにまとめる）
export type RunOut =
  | { type: 'started'; id: string }
  | { type: 'stdout'; id: string; text: string }
  | { type: 'stderr'; id: string; text: string }
  | { type: 'exit'; id: string; code: number }
  | { type: 'limit'; id: string; reason: 'output' }
  | { type: 'crash'; id: string; kind: CrashKind; message: string };
