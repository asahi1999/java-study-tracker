// meta の行（key で区別。設計書 3-2）
import { v2db } from './database';
import type { Meta, MetaApp, MetaJava, MetaKey } from './types';

export async function getMeta<K extends MetaKey>(
  key: K,
): Promise<Extract<Meta, { key: K }> | undefined> {
  return (await v2db.meta.get(key)) as Extract<Meta, { key: K }> | undefined;
}

/** 起動のたびに呼ぶ。初回は createdAt を書く */
export async function touchApp(now: string, contentVersion: string): Promise<MetaApp> {
  return v2db.transaction('rw', v2db.meta, async () => {
    const current = await getMeta('app');
    const next: MetaApp = {
      key: 'app',
      createdAt: current?.createdAt ?? now,
      lastActiveAt: now,
      lastContentVersion: contentVersion,
    };
    await v2db.meta.put(next);
    return next;
  });
}

export async function saveJavaSupport(
  support: MetaJava['support'],
  now: string,
  detail: string | null,
): Promise<void> {
  const row: MetaJava = { key: 'java', support, checkedAt: now, detail };
  await v2db.meta.put(row);
}
