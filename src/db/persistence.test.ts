import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestPersistentStorage } from './persistence';

/** navigator.storage を差し替える（jsdom にはないため） */
function mockStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
}

afterEach(() => {
  mockStorage(undefined);
});

describe('requestPersistentStorage', () => {
  it('ブラウザが対応していなければ false を返す', async () => {
    mockStorage(undefined);
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('すでに認められていれば、もう一度は頼まない', async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persisted: async () => true, persist });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('まだなら頼み、その結果を返す', async () => {
    mockStorage({ persisted: async () => false, persist: async () => false });
    await expect(requestPersistentStorage()).resolves.toBe(false);

    mockStorage({ persisted: async () => false, persist: async () => true });
    await expect(requestPersistentStorage()).resolves.toBe(true);
  });

  it('途中で失敗しても、アプリを止めずに false を返す', async () => {
    mockStorage({
      persisted: async () => {
        throw new Error('not allowed');
      },
      persist: async () => true,
    });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});
