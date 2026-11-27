// ホームなどの枠（上の帯 56px。05-visual-design.md 7-10）。
// ナビ（地図・作品・図鑑・記録・設定）は、その画面を作るフェーズ3で足す
import { Link, Outlet } from 'react-router-dom';

import { PixelTorchLogo } from '@/components/game/PixelTorchLogo';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b-2 border-line bg-topbar">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 md:px-8">
          <Link to="/" className="flex items-center gap-3 focus-visible:shadow-focus-in">
            <PixelTorchLogo size={32} />
            <span className="font-display text-display-s text-ink">Java ダンジョン工房</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
