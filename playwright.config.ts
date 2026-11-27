// ブラウザでの通しのテスト（設計書 12-2）。Chromium だけ。
// 本番と同じビルド（CSP の <meta> つき）を、見本の教材（tests/content-fixtures/good）で作って動かす（npm run e2e）
import { defineConfig, devices } from '@playwright/test';

const PORT = 4317;

export default defineConfig({
  testDir: 'tests/e2e',
  // 遅い CI でも落ちないよう、時間には余裕を持たせる
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/java-study-tracker/`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: `npx vite preview --outDir .cache/e2e-dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/java-study-tracker/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
