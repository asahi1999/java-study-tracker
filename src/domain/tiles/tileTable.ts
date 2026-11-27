// 文字とタイルの対応・色・8×8 ドットの形（設計書 8-2、05-visual-design.md 6-2 が正本）。
// 描画（SVG の symbol）は src/components/tiles/ がこの表から作る

export type TileName =
  | 'void'
  | 'floor'
  | 'wall'
  | 'door'
  | 'hero'
  | 'stairs-down'
  | 'stairs-up'
  | 'torch'
  | 'gold'
  | 'potion'
  | 'chest'
  | 'water'
  | 'trap'
  | 'grass'
  | 'pillar'
  | 'bar-full'
  | 'bar-empty'
  | 'bar-cap'
  | 'digit'
  | 'glyph';

const CHAR_TILES: Record<string, TileName> = {
  ' ': 'void',
  '.': 'floor',
  '#': 'wall',
  '+': 'door',
  '@': 'hero',
  '>': 'stairs-down',
  '<': 'stairs-up',
  '*': 'torch',
  $: 'gold',
  '!': 'potion',
  '&': 'chest',
  '~': 'water',
  '^': 'trap',
  '%': 'grass',
  '|': 'pillar',
  '=': 'bar-full',
  '-': 'bar-empty',
  '[': 'bar-cap',
  ']': 'bar-cap',
};

export function tileOf(ch: string): TileName {
  if (ch >= '0' && ch <= '9') return 'digit';
  return CHAR_TILES[ch] ?? 'glyph';
}

/** 読み上げと凡例の名前 */
export const TILE_LABELS: Record<TileName, string> = {
  void: '闇',
  floor: '床',
  wall: '壁',
  door: '扉',
  hero: '勇者',
  'stairs-down': '下り階段',
  'stairs-up': '上り階段',
  torch: '松明',
  gold: '金貨',
  potion: '薬',
  chest: '宝箱',
  water: '水',
  trap: '罠',
  grass: '草',
  pillar: '柱',
  'bar-full': 'バー（満）',
  'bar-empty': 'バー（空）',
  'bar-cap': 'バーの端',
  digit: '数字',
  glyph: '文字',
};

/** 読み上げで先に言う順（目立つもの → 地形） */
export const TILE_ORDER: TileName[] = [
  'hero',
  'stairs-down',
  'stairs-up',
  'torch',
  'gold',
  'potion',
  'chest',
  'trap',
  'door',
  'water',
  'grass',
  'pillar',
  'bar-full',
  'bar-empty',
  'bar-cap',
  'digit',
  'glyph',
  'wall',
  'floor',
  'void',
];

/** ドットの色（1文字 → 色）。05-visual-design.md 6-2 の値 */
export const PALETTE: Record<string, string> = {
  k: '#121019', // 闇
  d: '#24212f', // 床の地
  e: '#6f6890', // 床の粒
  j: '#221f2d', // 目地・枠
  s: '#7a7399', // 石
  S: '#8a83ad', // 石の明るい面
  b: '#b5793f', // 扉の板
  T: '#f4a83d', // 取っ手・金具・炎・勇者の体
  p: '#ece4d3', // 顔・光・括弧
  m: '#86c79f', // 下り階段・草・バー（満）
  w: '#6fb3d9', // 上り階段
  D: '#4a4462', // 松明の暗い壁
  f: '#ffe2a0', // 炎の芯
  h: '#7a5634', // 柄
  a: '#3b3550', // 消えた松明（灰）
  g: '#f2cc60', // 金貨
  G: '#c08a3e', // 金貨の影・宝箱の木
  P: '#f28cb1', // 薬
  W: '#1f4a66', // 水の地
  v: '#a9dcf5', // 波
  r: '#f08f70', // 罠
  L: '#1e3326', // 草の地
  q: '#b2abc2', // 柱
  M: '#86c79f', // バー（満）
  n: '#5d9a76', // バー（満）の影
  E: '#3d3854', // バー（空）
};

/** 文字のタイルの地と文字の色（数字・そのほか） */
export const GLYPH_COLORS = {
  ground: '#1a1824',
  digit: '#ece4d3',
  glyph: '#b2abc2',
} as const;

/** 8×8 ドットの形。1文字が1ドット（PALETTE のキー） */
export const SPRITES: Record<string, readonly string[]> = {
  void: [
    'kkkkkkkk',
    'kkkkkkkk',
    'kkkkkkkk',
    'kkkkkkkk',
    'kkkkkkkk',
    'kkkkkkkk',
    'kkkkkkkk',
    'kkkkkkkk',
  ],
  // 床の粒は2種類を市松に置き、行ごとに位置がずれて見えるようにする
  'floor-a': [
    'dddddddd',
    'dddddedd',
    'dddddddd',
    'dedddddd',
    'dddddddd',
    'dddddddd',
    'dddedddd',
    'dddddddd',
  ],
  'floor-b': [
    'dddddddd',
    'dddddddd',
    'dddddded',
    'dddddddd',
    'dddddddd',
    'ddeddddd',
    'dddddddd',
    'dddddddd',
  ],
  wall: [
    'SSSSjSSS',
    'ssssjsss',
    'ssssjsss',
    'jjjjjjjj',
    'SjSSSSSS',
    'sjssssss',
    'sjssssss',
    'jjjjjjjj',
  ],
  door: [
    'jjjjjjjj',
    'jbbbbbbj',
    'jbbbbbbj',
    'jbbbbbbj',
    'jbbbbTbj',
    'jbbbbbbj',
    'jbbbbbbj',
    'jjjjjjjj',
  ],
  hero: [
    'ddTTTTTd',
    'ddTpppTd',
    'ddTpppTd',
    'dTTTTTTd',
    'TTTTTTTT',
    'dTTTTTTd',
    'ddTddTdd',
    'ddTddTdd',
  ],
  'stairs-down': [
    'dddddddd',
    'mmmddddd',
    'kkkddddd',
    'kkkmmmdd',
    'kkkkkkdd',
    'kkkkkkmm',
    'kkkkkkkk',
    'kkkkkkkk',
  ],
  'stairs-up': [
    'dddddddd',
    'dddddwww',
    'dddddwdd',
    'ddwwwwdd',
    'ddwddddd',
    'wwwddddd',
    'wddddddd',
    'dddddddd',
  ],
  torch: [
    'DDDfDDDD',
    'DDTfTDDD',
    'DDTTTDDD',
    'jjjhjjjj',
    'DjDhDDDD',
    'DjDhDDDD',
    'DjDDDDDD',
    'jjjjjjjj',
  ],
  'torch-unlit': [
    'DDDDDDDD',
    'DDDaDDDD',
    'DDaaaDDD',
    'jjjhjjjj',
    'DjDhDDDD',
    'DjDhDDDD',
    'DjDDDDDD',
    'jjjjjjjj',
  ],
  gold: [
    'dddddddd',
    'ddggggdd',
    'dgggggGd',
    'dgggggGd',
    'dgggggGd',
    'dgggggGd',
    'ddGGGGdd',
    'dddddddd',
  ],
  potion: [
    'dddddddd',
    'dddPPddd',
    'dddPPddd',
    'ddPPPPdd',
    'dPpPPPPd',
    'dPPPPPPd',
    'ddPPPPdd',
    'dddddddd',
  ],
  chest: [
    'dddddddd',
    'dddddddd',
    'dGGGGGGd',
    'dTTTTTTd',
    'dGGTTGGd',
    'dGGGGGGd',
    'dGGGGGGd',
    'dddddddd',
  ],
  water: [
    'WWWWWWWW',
    'WvvWWWWW',
    'WWWWWWWW',
    'WWWWvvWW',
    'WWWWWWWW',
    'WvvWWWWW',
    'WWWWWWWW',
    'WWWWWvvW',
  ],
  trap: [
    'dddddddd',
    'dddddddd',
    'dddddddd',
    'drddrddr',
    'rrrrrrrr',
    'dddddddd',
    'dddddddd',
    'dddddddd',
  ],
  grass: [
    'LLLLLLLL',
    'LLmLLLLL',
    'LmmmLLmL',
    'LLmLLmmm',
    'LLLLLmLL',
    'LLmLLLLL',
    'LmmmLLLL',
    'LLLLLLLL',
  ],
  pillar: [
    'dqqqqqsd',
    'ddqqqsdd',
    'ddqqqsdd',
    'ddqqqsdd',
    'ddqqqsdd',
    'ddqqqsdd',
    'ddqqqsdd',
    'dqqqqqsd',
  ],
  'bar-full': [
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'nnnnnnnn',
  ],
  'bar-empty': [
    'EEEEEEEE',
    'EEEEEEEE',
    'EEEEEEEE',
    'EEEEEEEE',
    'EEEEEEEE',
    'EEEEEEEE',
    'EEEEEEEE',
    'EEEEEEEE',
  ],
  'bar-cap-l': [
    'kkpppkkk',
    'kkpkkkkk',
    'kkpkkkkk',
    'kkpkkkkk',
    'kkpkkkkk',
    'kkpkkkkk',
    'kkpkkkkk',
    'kkpppkkk',
  ],
  'bar-cap-r': [
    'kkkpppkk',
    'kkkkkpkk',
    'kkkkkpkk',
    'kkkkkpkk',
    'kkkkkpkk',
    'kkkkkpkk',
    'kkkkkpkk',
    'kkkpppkk',
  ],
};

/** 図と地の組（Vitest で 3:1 以上を確かめる。05-visual-design.md 6-2） */
export const CONTRAST_PAIRS: { tile: string; ground: string; figure: string }[] = [
  { tile: 'floor（粒 対 闇）', ground: PALETTE.k, figure: PALETTE.e },
  { tile: 'wall（石 対 床の地）', ground: PALETTE.d, figure: PALETTE.s },
  { tile: 'door', ground: PALETTE.j, figure: PALETTE.b },
  { tile: 'hero', ground: PALETTE.d, figure: PALETTE.T },
  { tile: 'stairs-down', ground: PALETTE.d, figure: PALETTE.m },
  { tile: 'stairs-up', ground: PALETTE.d, figure: PALETTE.w },
  { tile: 'torch', ground: PALETTE.D, figure: PALETTE.T },
  { tile: 'gold', ground: PALETTE.d, figure: PALETTE.g },
  { tile: 'potion', ground: PALETTE.d, figure: PALETTE.P },
  { tile: 'chest', ground: PALETTE.d, figure: PALETTE.G },
  { tile: 'water', ground: PALETTE.W, figure: PALETTE.v },
  { tile: 'trap', ground: PALETTE.d, figure: PALETTE.r },
  { tile: 'grass', ground: PALETTE.L, figure: PALETTE.m },
  { tile: 'pillar', ground: PALETTE.d, figure: PALETTE.q },
  { tile: 'bar（満 対 空）', ground: PALETTE.E, figure: PALETTE.M },
  { tile: 'bar-cap', ground: PALETTE.k, figure: PALETTE.p },
  { tile: 'digit', ground: GLYPH_COLORS.ground, figure: GLYPH_COLORS.digit },
  { tile: 'glyph', ground: GLYPH_COLORS.ground, figure: GLYPH_COLORS.glyph },
];

/** 16進の色どうしのコントラスト比（WCAG の相対輝度） */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = Number.parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
