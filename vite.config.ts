import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { cspPlugin } from './scripts/lib/csp.ts';

// 設定画面に出すアプリのバージョン。package.json の version を正本にする
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig({
  // GitHub Pages では https://<ユーザー名>.github.io/java-study-tracker/ で配信されるため
  base: '/java-study-tracker/',
  plugins: [react(), cspPlugin()],
  // 開発サーバーは決まったポートで動かす（設計書 2-2）。ポートが変わると IndexedDB の保存先が変わり、
  // 学んだ記録が見えなくなるので、使われていたら別のポートに移らずに止める
  server: { port: 5179, strictPort: true },
  build: {
    // 小さいフォントを data: URI にしない（CSP の font-src 'self' で止められるため。設計書 11-4）
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // 本物の teavm-javac と JDK を使うテストは npm run test:teavm（vitest.teavm.config.ts）で動かす
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.teavm.test.ts', 'tests/e2e/**'],
    // 1件のテストの上限時間。初期値の5秒では、ほかの処理でパソコンが忙しいときに、
    // IndexedDB を使う画面のテストが時間切れで失敗することがあった（負荷を3倍にすると1件で最大14秒）。
    // 画面の更新を待つ上限（tests/setup.ts の asyncUtilTimeout）より十分長くし、
    // 待っている途中でテストごと打ち切られないようにする
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      reporter: ['text', 'html'],
    },
  },
});
