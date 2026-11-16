import { Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { Modal } from '@/components/ui/Modal';

import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './navigation';

function tabClassName(isActive: boolean): string {
  const base =
    'flex h-14 w-full flex-col items-center justify-center gap-1 border-t-[3px] text-[10px] font-bold leading-none transition-colors';
  return isActive
    ? `${base} border-accent text-board-ink`
    : `${base} border-transparent text-board-muted`;
}

/** スマホ（768px未満）で下部に表示するタブ。5つ目の「その他」から残りの画面を開く */
export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();

  // 「その他」の中の画面を表示しているときは、「その他」のタブを選択中として見せる
  const moreActive = SECONDARY_NAV_ITEMS.some((item) => pathname.startsWith(item.to));

  return (
    <>
      <nav
        aria-label="タブメニュー"
        className="on-board fixed inset-x-0 bottom-0 z-30 bg-board pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => tabClassName(isActive)}>
                <Icon aria-hidden className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className={tabClassName(moreActive)}
            >
              <Ellipsis aria-hidden className="size-5" />
              その他
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="その他" variant="sheet">
        <ul className="grid gap-1">
          {SECONDARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded px-3 py-3 text-[15px] transition-colors hover:bg-ink/5 ${
                    isActive ? 'bg-ink/5 font-bold' : ''
                  }`
                }
              >
                <Icon aria-hidden className="size-5 text-muted" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
