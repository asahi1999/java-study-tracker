import {
  AlarmClockCheck,
  Award,
  Boxes,
  CalendarCheck,
  Clock,
  Database,
  Flag,
  Flame,
  GitBranch,
  Leaf,
  type LucideIcon,
  NotebookPen,
  Trophy,
} from 'lucide-react';

/** バッジごとのアイコン。定義（src/data/badges.ts）は画面の部品に依存させたくないので、ここで対応させる */
export const BADGE_ICONS: Readonly<Record<string, LucideIcon>> = {
  'first-log': NotebookPen,
  'first-done': Flag,
  'streak-3': Flame,
  'streak-7': Flame,
  'streak-30': Flame,
  'hours-10': Clock,
  'hours-50': Clock,
  'hours-100': Clock,
  'month-1': CalendarCheck,
  'month-2': CalendarCheck,
  oop: Boxes,
  sql: Database,
  spring: Leaf,
  'repo-5': GitBranch,
  'on-time': AlarmClockCheck,
  complete: Trophy,
};

/** 定義にないIDのときに使うアイコン */
export const FALLBACK_BADGE_ICON: LucideIcon = Award;
