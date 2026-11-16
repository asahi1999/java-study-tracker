import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

// 全画面で共通の枠。PCは左にサイドバー、スマホは下部にタブを置き、その中にページを表示する
export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // 画面を切り替えたら先頭から表示する。前の画面のスクロール位置が残らないようにするため
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh">
      {/*
        キーボード操作でメニューを飛ばして本文へ移動するためのボタン。
        HashRouter では「#main」のリンクが画面の切り替えとして扱われるので、リンクではなくボタンにしている
      */}
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-bold focus-visible:text-accent-ink"
      >
        本文へ移動
      </button>

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 outline-none md:px-8 md:pb-10 md:pt-7"
        >
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
