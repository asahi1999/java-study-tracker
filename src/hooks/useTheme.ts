import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { settingsRepository } from '@/db/repositories';
import { readCachedTheme, writeCachedTheme } from '@/db/themeCache';
import { resolveTheme } from '@/lib/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** OSがダークモードかどうか。OS側で切り替えられたら再描画する */
export function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(subscribeToSystemTheme, getSystemPrefersDark);
}

/** 設定のテーマを <html> に反映する。アプリ全体で1か所だけ呼ぶ */
export function useApplyTheme(): void {
  const settings = useLiveQuery(() => settingsRepository.get());
  const systemPrefersDark = useSystemPrefersDark();
  // 設定を読み込むまでは localStorage の写しを使う。
  // index.html の起動前スクリプトと同じ結果になり、起動時に表示が切り替わらない
  const [cachedTheme] = useState(readCachedTheme);

  const savedTheme = settings?.theme;
  const resolved = resolveTheme(savedTheme ?? cachedTheme ?? 'system', systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    // 入力欄やスクロールバーなど、ブラウザが描く部品の色もテーマに合わせる
    root.style.colorScheme = resolved;
  }, [resolved]);

  useEffect(() => {
    // 設定変更・インポート・リセットのどれで変わっても、次回の起動に間に合うよう写しを更新する
    if (savedTheme) writeCachedTheme(savedTheme);
  }, [savedTheme]);
}
