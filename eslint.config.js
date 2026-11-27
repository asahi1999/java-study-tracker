import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // public/java は teavm-javac の配布物（直さずに使う）。src/content/generated は content-build の出力
  globalIgnores([
    'dist',
    'coverage',
    'public/java',
    'src/content/generated',
    '.cache',
    'test-results',
    'playwright-report',
    // デザインのモック（ブラウザで直接開く見本。アプリのコードではない）
    'docs/revamp/mockups',
  ]),

  // すべてのファイルに共通のルール
  {
    extends: [js.configs.recommended],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // アプリ本体とテスト（ブラウザで動くコード）
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // 「const { id, ...rest } = obj」のように、一部の項目を取り除く目的で書いた変数は未使用でも許可する
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },

  // 設定ファイルとスクリプト（Node.js で動くコード）
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

  // 整形は Prettier に任せるので、競合するルールを最後に無効化する
  eslintConfigPrettier,
]);
