// 本物の teavm-javac と JDK を使うテスト（npm run test:teavm。設計書 12-1・14章）。
// npm test（check ジョブ）では動かさない。Node で teavm を何度も使うと落ちることがあるので、
// テストファイルごとに別のプロセスで動かす
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.teavm.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    environment: 'node',
    pool: 'forks',
    isolate: true,
    // JDK と teavm-javac で教材を何十回も動かすので長めにする
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
