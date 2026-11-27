// 本番のビルドの index.html にだけ CSP の <meta> を付ける（設計書 11-4）。
// 開発サーバーは Vite がインラインのスクリプトを入れるので付けない。
// index.html の起動前のテーマのスクリプト（インライン）は、中身の sha256 を script-src に足して許す
import { createHash } from 'node:crypto';

import type { Plugin } from 'vite';

export const CSP_DIRECTIVES: [string, string][] = [
  ['default-src', "'self'"],
  ['script-src', "'self' 'wasm-unsafe-eval'"],
  ['worker-src', "'self'"],
  ['connect-src', "'self'"],
  ['img-src', "'self' data:"],
  ['font-src', "'self'"],
  // CodeMirror が <style> を足すため（設計書 11-4）
  ['style-src', "'self' 'unsafe-inline'"],
  ['object-src', "'none'"],
  ['base-uri', "'self'"],
];

const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

export function inlineScriptHashes(html: string): string[] {
  return [...html.matchAll(INLINE_SCRIPT_RE)]
    .map((m) => m[1])
    .filter((body) => body.trim() !== '')
    .map((body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
}

export function buildCsp(hashes: string[]): string {
  return CSP_DIRECTIVES.map(([name, value]) =>
    name === 'script-src' && hashes.length > 0
      ? `${name} ${value} ${hashes.join(' ')}`
      : `${name} ${value}`,
  ).join('; ');
}

/** <meta charset> のすぐ後ろ（どのスクリプトよりも前）に CSP を入れる */
export function injectCsp(html: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(inlineScriptHashes(html))}" />`;
  const charset = /<meta charset="[^"]*"\s*\/?>/i;
  if (!charset.test(html)) throw new Error('index.html に <meta charset> が無い');
  return html.replace(charset, (m) => `${m}\n    ${meta}`);
}

export function cspPlugin(): Plugin {
  return {
    name: 'jq-csp',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: injectCsp },
  };
}
