import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { JavaRunner, RunnerStatus } from '@/runtime/java/JavaRunner';

type State = { status: RunnerStatus; progress: number };

/** Java の実行環境の状態と、準備の進み具合（0〜1） */
export function useRunnerStatus(runner: JavaRunner): State {
  // 進み具合は subscribe でしか届かないので、最後に届いた値を覚えておく
  const last = useRef<State>({ status: runner.status, progress: 0 });
  const subscribe = useCallback(
    (onChange: () => void) =>
      runner.subscribe((status, progress) => {
        last.current = { status, progress: progress ?? 0 };
        onChange();
      }),
    [runner],
  );
  const getSnapshot = useCallback(() => {
    if (last.current.status !== runner.status)
      last.current = { status: runner.status, progress: 0 };
    return last.current;
  }, [runner]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
