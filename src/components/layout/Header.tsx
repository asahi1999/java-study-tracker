import { LineRail } from './LineRail';

// 全画面の上部に置く濃紺の板。中身は路線バーだけにして、現在地が一目で分かるようにしている
export function Header() {
  return (
    <header className="on-board bg-board text-board-ink">
      <div className="mx-auto w-full max-w-5xl px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8">
        <LineRail />
      </div>
    </header>
  );
}
