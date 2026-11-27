import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ROOT } from './lib/paths.ts';
import { findBundleDirs, parseSums, verifyDir } from './teavm-verify.ts';

let tmp: string | null = null;
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

const HELLO_SHA = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

describe('teavm-verify', () => {
  it('同梱の teavm-javac は SHA256SUMS と一致する', () => {
    const dirs = findBundleDirs(path.join(ROOT, 'public', 'java'));
    expect(dirs.length).toBeGreaterThan(0);
    for (const dir of dirs) expect(verifyDir(dir)).toEqual([]);
  });

  it('ハッシュの違い・無いファイル・載っていないファイルを見つける', () => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'jq-sums-'));
    writeFileSync(path.join(tmp, 'a.bin'), 'hello');
    writeFileSync(path.join(tmp, 'b.bin'), 'changed');
    writeFileSync(path.join(tmp, 'extra.js'), '');
    writeFileSync(path.join(tmp, 'NOTE.md'), '');
    writeFileSync(
      path.join(tmp, 'SHA256SUMS'),
      `${HELLO_SHA}  a.bin\n${HELLO_SHA}  b.bin\n${HELLO_SHA}  gone.bin\n`,
    );
    expect(verifyDir(tmp).map((p) => `${p.file}: ${p.reason.split('（')[0]}`)).toEqual([
      'b.bin: ハッシュが違う',
      'gone.bin: ファイルが無い',
      'extra.js: SHA256SUMS に載っていない',
    ]);
  });

  it('SHA256SUMS の行の形', () => {
    expect(parseSums(`${HELLO_SHA} *a.bin\n\n`).get('a.bin')).toBe(HELLO_SHA);
    expect(() => parseSums('xyz a.bin')).toThrow();
  });
});
