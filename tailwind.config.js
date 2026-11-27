// デザイントークン（docs/revamp/05-visual-design.md 4章が正本）。
// 色は src/index.css の CSS 変数（R G B の3つの数）で持ち、ライト／ダークで値が切り替わる。
// ここでは、その変数を Tailwind のクラス（bg-panel、text-ink-dim、bg-torch/15 など）で使えるようにする
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  // OS の設定ではなく、アプリの設定（ライト／ダーク／システム）で切り替えるため class 方式にする
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // 角丸は使わない（ピクセルの角欠けは notch-2 / notch-4 で）
    borderRadius: { none: '0', DEFAULT: '0' },
    extend: {
      colors: {
        bg: token('bg'),
        panel: { DEFAULT: token('panel'), 2: token('panel-2') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), dim: token('ink-dim'), faint: token('ink-faint') },
        topbar: token('topbar'),
        torch: {
          DEFAULT: token('torch'),
          hover: token('torch-hover'),
          press: token('torch-press'),
          ink: token('torch-ink'),
          hi: token('torch-hi'),
          text: token('torch-text'),
        },
        moss: token('moss'),
        rune: token('rune'),
        ember: token('ember'),
        water: token('water'),
        focus: token('focus'),
        well: {
          DEFAULT: token('well'),
          2: token('well-2'),
          ink: token('well-ink'),
          dim: token('well-dim'),
          faint: token('well-faint'),
        },
        syntax: {
          keyword: '#c9b5ff',
          type: '#86c6ea',
          string: '#a3dcb6',
          number: '#f7c47f',
          comment: '#8e88a3',
          method: '#f2e9d8',
          punct: '#a9a2bb',
          error: '#f08f70',
        },
      },
      fontFamily: {
        display: ['DotGothic16', '"BIZ UDPGothic"', '"Hiragino Sans"', 'sans-serif'],
        sans: ['"BIZ UDPGothic"', '"Hiragino Sans"', '"Yu Gothic UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.6' }],
        base: ['15px', { lineHeight: '1.7' }],
        lg: ['17px', { lineHeight: '1.5' }],
        code: ['14px', { lineHeight: '22px' }],
        'code-sm': ['12px', { lineHeight: '18px' }],
        'display-s': ['16px', { lineHeight: '1.5', letterSpacing: '0.04em' }],
        'display-m': ['24px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        'display-l': ['32px', { lineHeight: '1.35', letterSpacing: '0.02em' }],
      },
      boxShadow: {
        press: 'inset 0 -4px 0 rgb(var(--torch-press))',
        edge: 'inset 0 0 0 2px rgb(var(--line-strong))',
        'focus-in': 'inset 0 0 0 2px rgb(var(--focus))',
      },
      transitionDuration: { fast: '120ms', base: '200ms', slow: '400ms' },
      transitionTimingFunction: { ui: 'cubic-bezier(.2,.8,.2,1)', pixel: 'steps(3, end)' },
      keyframes: {
        ignite: {
          from: { opacity: '0', transform: 'scale(.6)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        sweep: { from: { left: '-40%' }, to: { left: '120%' } },
        breathe: { '50%': { opacity: '0.6' } },
      },
      animation: {
        ignite: 'ignite 240ms steps(3, end) both',
        sweep: 'sweep 900ms cubic-bezier(.2,.8,.2,1) 1',
        breathe: 'breathe 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
