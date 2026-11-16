import type { Theme } from '@/types';

/**
 * テーマの写しを置く localStorage のキー。
 * index.html の起動前スクリプトも同じキーを読むので、変えるときは両方を直す
 */
export const THEME_CACHE_KEY = 'java-study-tracker:theme';

const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme === value);
}

// 設定の正本は IndexedDB にある。ただし IndexedDB は読み込みが非同期で、
// 起動直後の最初の描画に間に合わない。テーマだけは同期で読める localStorage にも
// 写しを置き、起動時に画面がちがうテーマで一瞬光るのを防いでいる

/** 写しを読む。未保存・不正な値・読めない環境では null を返す */
export function readCachedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_CACHE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** 写しを書く。プライベートブラウズなどで書けなくても、アプリは止めない */
export function writeCachedTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // 写しがなくても動作に支障はない（起動時にOSの設定で表示されるだけ）
  }
}
