// compiler.wasm-runtime.js（teavm-javac の読み込み用 JS）の、使う部分だけの型。
// 中身は直さずに使う（設計書 4-1）。

export type TeavmDiagnostic = {
  type: string; // 'javac' か TeaVM のもの
  severity: string; // 'error' | 'warning' など
  fileName: string | null;
  lineNumber: number;
  columnNumber: number; // 1始まり（javac のとき）
  message: string;
};

export type TeavmCompiler = {
  setSdk(bytes: Int8Array): void;
  setTeaVMClasslib(bytes: Int8Array): void;
  addClassFile(path: string, bytes: Int8Array): void;
  addSourceFile(path: string, content: string): void;
  onDiagnostic(listener: (d: TeavmDiagnostic) => void): void;
  compile(): boolean;
  generateWebAssembly(options: {
    outputName: string;
    mainClass: string;
    obfuscated?: boolean;
  }): Promise<boolean> | boolean;
  getWebAssemblyOutputFile(name: string): Int8Array;
};

export type TeavmCompilerModule = {
  exports: { createCompiler(): TeavmCompiler };
};

export type TeavmApp = {
  exports: { main(args: string[]): void };
};

export type TeavmConsoleImports = {
  teavmConsole: {
    putcharStdout(code: number): void;
    putcharStderr(code: number): void;
  };
};

export type TeavmLoadOptions = {
  stackDeobfuscator?: { enabled: boolean; path?: string };
  onExit?: (code: number) => void;
  installImports?: (imports: TeavmConsoleImports) => void;
};

export type TeavmLoad = <T>(
  wasm: ArrayBuffer | Uint8Array | Int8Array | string,
  options?: TeavmLoadOptions,
) => Promise<T>;

export type TeavmRuntimeModule = { load: TeavmLoad };
