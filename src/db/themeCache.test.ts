import { describe, expect, it, vi } from 'vitest';

import indexHtml from '../../index.html?raw';
import { readCachedTheme, THEME_CACHE_KEY, writeCachedTheme } from './themeCache';

describe('themeCache', () => {
  it('書いたテーマを読める', () => {
    writeCachedTheme('dark');

    expect(readCachedTheme()).toBe('dark');
  });

  it('まだ保存していなければ null を返す', () => {
    expect(readCachedTheme()).toBeNull();
  });

  it('テーマとして不正な値は null として扱う', () => {
    localStorage.setItem(THEME_CACHE_KEY, 'sepia');

    expect(readCachedTheme()).toBeNull();
  });

  it('localStorage が使えない環境でも例外を投げない', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(readCachedTheme()).toBeNull();
    expect(() => writeCachedTheme('dark')).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('index.html の起動前スクリプトと同じキーを使っている', () => {
    // 起動前スクリプトは TypeScript の外にあるので、キーがずれてもビルドでは気づけない
    expect(indexHtml).toContain(`localStorage.getItem('${THEME_CACHE_KEY}')`);
  });
});
