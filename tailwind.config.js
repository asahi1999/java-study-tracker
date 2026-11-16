/** @type {import('tailwindcss').Config} */
export default {
  // OSの設定ではなく、アプリの設定（ライト／ダーク／システム）で切り替えるため class 方式にする
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
