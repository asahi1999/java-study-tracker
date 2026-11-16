import type { Theme } from '@/types';

export type ResolvedTheme = 'light' | 'dark';

/** 設定の値とOSの設定から、実際に表示するテーマを決める */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light';
  return theme;
}
