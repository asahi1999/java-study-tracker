import { useEffect, useState } from 'react';

import { requestPersistentStorage } from '@/db/persistence';
import { seedIfEmpty } from '@/db/seed';

export type BootstrapState =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

/** アプリ起動時の準備（初期データの投入）を行い、その状態を返す */
export function useAppBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    seedIfEmpty()
      .then(() => {
        // 結果は画面に影響しないので待たない
        void requestPersistentStorage();
        if (!cancelled) setState({ status: 'ready' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
