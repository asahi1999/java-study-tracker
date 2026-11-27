// 対応ブラウザの判定（設計書 4-9）。teavm-javac は WasmGC が要る（Safari 18.1 などは動かない）
import type { JavaRunner, RunnerStatus } from './JavaRunner.ts';

/**
 * GC の struct 型を1つだけ持つ最小のモジュール。
 * 型の節（id 1、長さ 5）: 型の数 1、struct（0x5f）、項目の数 1、i32（0x7f）、変更不可（0x00）。
 * WasmGC の無いブラウザでは 0x5f を読めず false になる（Chrome 158・Node 24 で true を確認）
 */
export const WASM_GC_PROBE = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x5f, 0x01, 0x7f, 0x00,
]);

export function isWasmGcSupported(
  wasm: Pick<typeof WebAssembly, 'validate'> | null = globalThis.WebAssembly ?? null,
): boolean {
  try {
    return !!wasm && wasm.validate(WASM_GC_PROBE);
  } catch {
    return false;
  }
}

/** 非対応のブラウザで使う JavaRunner。何も読み込まず、run は unsupported を返す */
export function createUnsupportedRunner(): JavaRunner {
  const status: RunnerStatus = 'unsupported';
  return {
    status,
    subscribe: () => () => {},
    prepare: async () => {},
    run: async () => ({ kind: 'unsupported' }),
    cancel: () => {},
  };
}
