// グラフ（Recharts）で使う色と文字の設定。
// 色は src/index.css のCSS変数を参照するので、ライト／ダークの切り替えにそのまま追従する

export const CHART_COLORS = {
  ink: 'rgb(var(--ink))',
  muted: 'rgb(var(--muted))',
  line: 'rgb(var(--line))',
  surface: 'rgb(var(--surface))',
  accent: 'rgb(var(--accent))',
  /** 実績の線・棒。ライトでは濃紺、ダークでは黄色 */
  progress: 'rgb(var(--progress))',
};

/** 軸の目盛りの文字 */
export const AXIS_TICK = { fontSize: 11, fill: CHART_COLORS.muted };
