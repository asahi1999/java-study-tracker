// 画面が使う外の部品（Java の実行・教材・時刻）。テストでは偽物に差し替える（設計書 14章）
import { createContext, type ReactNode, useContext } from 'react';

import type { ContentSource } from '@/content/loader';
import type { JavaRunner } from '@/runtime/java/JavaRunner';

export type AppServices = {
  runner: JavaRunner;
  content: ContentSource;
  /** いまの時刻（ISO 文字列を作るのに使う） */
  now: () => Date;
};

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('ServicesProvider の外で使われた');
  return services;
}
