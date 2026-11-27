import { describe, expect, it } from 'vitest';

import { createUnsupportedRunner, isWasmGcSupported, WASM_GC_PROBE } from './support.ts';

describe('isWasmGcSupported（設計書 4-9）', () => {
  it('WasmGC のある環境（Node 24）では true', () => {
    expect(WebAssembly.validate(WASM_GC_PROBE)).toBe(true);
    expect(isWasmGcSupported()).toBe(true);
  });

  it('validate が false・例外・WebAssembly 無しなら false', () => {
    expect(isWasmGcSupported({ validate: () => false })).toBe(false);
    expect(
      isWasmGcSupported({
        validate: () => {
          throw new Error('x');
        },
      }),
    ).toBe(false);
    expect(isWasmGcSupported(null)).toBe(false);
  });
});

describe('createUnsupportedRunner', () => {
  it('状態は unsupported で、実行すると unsupported を返す', async () => {
    const runner = createUnsupportedRunner();
    expect(runner.status).toBe('unsupported');
    await runner.prepare();
    const job = {
      stepId: 'ch00.a',
      rev: 1,
      source: 'compact' as const,
      learnerFiles: [],
      givenFiles: [],
      testsJava: null,
      stdin: '',
      stages: [],
      timeoutMs: 3000,
    };
    expect(await runner.run(job)).toEqual({ kind: 'unsupported' });
  });
});
