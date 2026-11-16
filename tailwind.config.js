// 色は src/index.css のCSS変数で定義している（ライト／ダークで値が切り替わる）。
// ここでは、その変数を Tailwind のクラス（bg-surface、text-ink/60 など）で使えるようにする
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const statusColor = (name) => ({
  DEFAULT: token(`st-${name}`),
  fg: token(`st-${name}-fg`),
  bg: token(`st-${name}-bg`),
});

/** @type {import('tailwindcss').Config} */
export default {
  // OSの設定ではなく、アプリの設定（ライト／ダーク／システム）で切り替えるため class 方式にする
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        subtle: token('subtle'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        // 濃紺の「板」（サイドバー・路線バー・下部タブ）。駅の案内サインを手本にしている
        board: {
          DEFAULT: token('board'),
          ink: token('board-ink'),
          muted: token('board-muted'),
          line: token('board-line'),
          alert: token('board-alert'),
        },
        accent: {
          DEFAULT: token('accent'),
          ink: token('accent-ink'),
        },
        progress: token('progress'),
        // 学習カレンダーの色の濃さ（0〜4）
        heat: {
          0: token('heat-0'),
          1: token('heat-1'),
          2: token('heat-2'),
          3: token('heat-3'),
          4: token('heat-4'),
        },
        // 状態の色はアクセント色とは別に定義する
        status: {
          gray: statusColor('gray'),
          blue: statusColor('blue'),
          green: statusColor('green'),
          red: statusColor('red'),
        },
      },
      fontFamily: {
        // 先頭の "JST Numerals" は数字だけを持つフォント（src/index.css で定義）
        sans: [
          '"JST Numerals"',
          '"BIZ UDPGothic"',
          '"Hiragino Sans"',
          '"Yu Gothic UI"',
          'Meiryo',
          'sans-serif',
        ],
        num: ['"Barlow Semi Condensed"', '"BIZ UDPGothic"', 'sans-serif'],
      },
      keyframes: {
        // 車内の路線案内で「次の駅」が点滅する動きを、進行中の週に使う
        station: {
          '0%, 100%': { boxShadow: '0 0 0 2.5px rgb(var(--accent))' },
          '50%': { boxShadow: '0 0 0 2.5px rgb(var(--accent) / 0.3)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        station: 'station 2.4s ease-in-out infinite',
        'modal-in': 'modal-in 160ms ease-out',
      },
    },
  },
  plugins: [],
};
