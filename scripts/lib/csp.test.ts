import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { buildCsp, injectCsp, inlineScriptHashes } from './csp.ts';

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <script>
      var a = 1;
    </script>
    <script type="module" crossorigin src="/assets/index.js"></script>
  </head>
</html>`;

describe('CSP', () => {
  it('インラインのスクリプトだけを、中身の sha256 にする', () => {
    const body = '\n      var a = 1;\n    ';
    const expected = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
    expect(inlineScriptHashes(HTML)).toEqual([expected]);
  });

  it('設計書 11-4 の中身に、ハッシュを script-src に足す', () => {
    const csp = buildCsp(["'sha256-x'"]);
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval' 'sha256-x'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain(" 'unsafe-eval'");
  });

  it('<meta charset> のすぐ後ろ（スクリプトより前）に入れる', () => {
    const out = injectCsp(HTML);
    const meta = out.indexOf('Content-Security-Policy');
    expect(meta).toBeGreaterThan(out.indexOf('<meta charset'));
    expect(meta).toBeLessThan(out.indexOf('<script'));
  });
});
