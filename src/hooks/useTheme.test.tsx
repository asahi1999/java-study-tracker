import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { settingsRepository } from '@/db/repositories';
import { createInitialSettings } from '@/db/seed';
import { readCachedTheme, writeCachedTheme } from '@/db/themeCache';
import type { Theme } from '@/types';

import { setSystemPrefersDark } from '../../tests/matchMedia';
import { useApplyTheme } from './useTheme';

async function saveTheme(theme: Theme): Promise<void> {
  await db.settings.put({ ...createInitialSettings('2026-11-16'), theme });
}

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

describe('useApplyTheme', () => {
  it('ダーク固定なら <html> に dark クラスを付ける', async () => {
    await saveTheme('dark');

    renderHook(() => useApplyTheme());

    await waitFor(() => expect(isDark()).toBe(true));
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('ライト固定ならOSがダークでも dark クラスを付けない', async () => {
    await saveTheme('light');
    setSystemPrefersDark(true);

    renderHook(() => useApplyTheme());

    await waitFor(() => expect(document.documentElement.style.colorScheme).toBe('light'));
    expect(isDark()).toBe(false);
  });

  it('システムに合わせる設定ならOSの設定に従う', async () => {
    await saveTheme('system');
    setSystemPrefersDark(true);

    renderHook(() => useApplyTheme());

    await waitFor(() => expect(isDark()).toBe(true));
  });

  it('OSの設定が途中で変わったら追従する', async () => {
    await saveTheme('system');
    renderHook(() => useApplyTheme());
    await waitFor(() => expect(document.documentElement.style.colorScheme).toBe('light'));

    act(() => setSystemPrefersDark(true));

    await waitFor(() => expect(isDark()).toBe(true));
  });

  it('設定が変更されたらすぐに反映する', async () => {
    await saveTheme('light');
    renderHook(() => useApplyTheme());
    await waitFor(() => expect(document.documentElement.style.colorScheme).toBe('light'));

    await act(() => settingsRepository.update({ theme: 'dark' }));

    await waitFor(() => expect(isDark()).toBe(true));
  });

  it('設定も写しもなければOSの設定に合わせる', async () => {
    setSystemPrefersDark(true);

    renderHook(() => useApplyTheme());

    await waitFor(() => expect(isDark()).toBe(true));
  });

  describe('localStorage の写し', () => {
    it('設定を読み込む前は写しのテーマで表示する', () => {
      writeCachedTheme('dark');

      renderHook(() => useApplyTheme());

      // IndexedDB の読み込みを待たず、最初の描画の時点でダークになっていること
      expect(isDark()).toBe(true);
    });

    it('写しがライトなら、OSがダークでも最初からライトで表示する', () => {
      writeCachedTheme('light');
      setSystemPrefersDark(true);

      renderHook(() => useApplyTheme());

      expect(isDark()).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });

    it('設定を読み込んだら写しを更新する', async () => {
      await saveTheme('dark');

      renderHook(() => useApplyTheme());

      await waitFor(() => expect(readCachedTheme()).toBe('dark'));
    });

    it('設定が変更されたら写しも更新する', async () => {
      await saveTheme('light');
      renderHook(() => useApplyTheme());
      await waitFor(() => expect(readCachedTheme()).toBe('light'));

      await act(() => settingsRepository.update({ theme: 'system' }));

      await waitFor(() => expect(readCachedTheme()).toBe('system'));
    });

    it('写しと設定が食い違っていたら、設定を正として表示する', async () => {
      writeCachedTheme('dark');
      await saveTheme('light');

      renderHook(() => useApplyTheme());

      await waitFor(() => expect(isDark()).toBe(false));
      expect(readCachedTheme()).toBe('light');
    });
  });
});
