import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),

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
  },

  // 設定ファイル（Node.js で動くコード）
  {
    files: ['*.config.{js,ts}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

  // 整形は Prettier に任せるので、競合するルールを最後に無効化する
  eslintConfigPrettier,
]);
