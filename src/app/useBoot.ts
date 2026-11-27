// 起動時の準備（v2）。DB を開いて meta.app を書き、対応ブラウザを判定して meta.java に残す（設計書 3-2・4-9）。
// v1 の DB は開かない（移行はフェーズ3）
import { useEffect, useState } from 'react';

import { v2db } from '@/db/v2/database';
import { saveJavaSupport, touchApp } from '@/db/v2/meta';

import type { AppServices } from './services';

export type BootState =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export function useBoot(services: AppServices, wasmGcSupported: boolean): BootState {
  const [state, setState] = useState<BootState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await v2db.open();
      const now = services.now().toISOString();
      await touchApp(now, services.content.course.version);
      await saveJavaSupport(
        wasmGcSupported ? 'ok' : 'unsupported',
        now,
        wasmGcSupported ? null : 'WebAssembly GC（WasmGC）が使えない',
      );
    })().then(
      () => !cancelled && setState({ status: 'ready' }),
      (e: unknown) =>
        !cancelled &&
        setState({
          status: 'error',
          message: `データベースを開けませんでした: ${String((e as Error)?.message ?? e)}`,
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [services, wasmGcSupported]);
  return state;
}
