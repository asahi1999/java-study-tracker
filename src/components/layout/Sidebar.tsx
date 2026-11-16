import { NavLink } from 'react-router-dom';

import { BrandMark } from './BrandMark';
import { NAV_ITEMS } from './navigation';

function linkClassName({ isActive }: { isActive: boolean }): string {
  const base =
    'flex items-center gap-3 rounded border-l-[3px] py-2 pl-3 pr-2 text-sm transition-colors';
  return isActive
    ? `${base} border-accent bg-white/10 font-bold text-board-ink`
    : `${base} border-transparent text-board-muted hover:bg-white/5 hover:text-board-ink`;
}

/** PC（768px以上）で左に表示するメニュー */
export function Sidebar() {
  return (
    <aside className="on-board sticky top-0 hidden h-dvh w-56 shrink-0 flex-col bg-board text-board-ink md:flex">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <BrandMark />
        <p className="font-num text-lg font-bold leading-[1.05] tracking-wide">
          Java Study
          <br />
          Tracker
        </p>
      </div>
      {/* 下の余白は、サイドバーの下に置く学習タイマーにメニューが隠れないようにするため */}
      <nav aria-label="メインメニュー" className="flex-1 overflow-y-auto px-3 pb-20">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={linkClassName}>
                <Icon aria-hidden className="size-[18px] shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
