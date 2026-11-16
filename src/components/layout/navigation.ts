import {
  Award,
  ChartColumn,
  LayoutDashboard,
  type LucideIcon,
  Map,
  NotebookPen,
  PencilRuler,
  Settings,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** true のとき、パスが完全に一致した場合だけ「現在の画面」として扱う */
  end?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'ダッシュボード', icon: LayoutDashboard, end: true },
  { to: '/roadmap', label: 'ロードマップ', icon: Map },
  { to: '/logs', label: '学習ログ', icon: NotebookPen },
  { to: '/stats', label: '統計', icon: ChartColumn },
  { to: '/badges', label: '実績バッジ', icon: Award },
  { to: '/editor', label: 'ロードマップ編集', icon: PencilRuler },
  { to: '/settings', label: '設定', icon: Settings },
];

// スマホの下部タブには5つまでしか並べられないので、
// よく使う4画面をタブにし、残りは「その他」にまとめる
const PRIMARY_COUNT = 4;

/** スマホの下部タブに直接並べる画面 */
export const PRIMARY_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.slice(0, PRIMARY_COUNT);

/** スマホでは「その他」から開く画面 */
export const SECONDARY_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.slice(PRIMARY_COUNT);
