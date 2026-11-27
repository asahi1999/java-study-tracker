// teavm-javac の同梱ファイルの場所（public/ からの相対パス）。
// 画面（Worker）と scripts/（Node）の両方が使う。版を上げたらフォルダ名をここで変える（SOURCE.md）

export const TEAVM_VERSION = '0.17.0-pg4';
export const TEAVM_DIR = `java/teavm-javac/${TEAVM_VERSION}/`;

export const TEAVM_FILES = {
  compilerWasm: 'compiler.wasm',
  runtimeJs: 'compiler.wasm-runtime.js',
  runtimeClasslib: 'runtime-classlib-teavm.bin',
  compileClasslib: 'compile-classlib-teavm.bin',
  deobfuscator: 'compiler.wasm-deobfuscator.wasm',
} as const;

export type TeavmFileKey = keyof typeof TEAVM_FILES;

/** content-build が作る public/java/manifest.json の形（4-10。進み具合の表示に使う大きさ） */
export type JavaManifest = {
  teavm: {
    version: string;
    dir: string;
    sizes: Record<string, number>; // ファイル名 → バイト数
  };
};
