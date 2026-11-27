import { Link } from 'react-router-dom';

import { buttonClass } from '@/components/game/buttonStyles';

export function NotFound() {
  return (
    <section className="notch-2 max-w-xl border-2 border-line bg-panel p-6">
      <h1 className="font-display text-display-m">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-ink-dim">
        URL が間違っているか、ページが移動した可能性があります。
      </p>
      <Link to="/" className={buttonClass('secondary', 'md', 'mt-6')}>
        ホームへ戻る
      </Link>
    </section>
  );
}
