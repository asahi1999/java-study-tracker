// テーマを <html> に当てる（v2）。設定の正本は meta.settings（設定画面はフェーズ3）。
// 読めるまでは localStorage の写し（index.html の起動前スクリプトと同じキー）を使う
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { readCachedTheme, writeCachedTheme } from '@/db/themeCache';
import { v2db } from '@/db/v2/database';
import type { MetaSettings } from '@/db/v2/types';
import { resolveTheme } from '@/lib/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function useApplyTheme(): void {
  const settings = useLiveQuery(() => v2db.meta.get('settings')) as MetaSettings | undefined;
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia(DARK_QUERY).matches);
  const [cached] = useState(readCachedTheme);
  const saved = settings?.theme;
  const resolved = resolveTheme(saved ?? cached ?? 'system', systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  useEffect(() => {
    if (saved) writeCachedTheme(saved);
  }, [saved]);
}
