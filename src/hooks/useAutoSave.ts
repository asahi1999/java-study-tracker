import { useCallback, useEffect, useRef, useState } from 'react';

/** idle: 変更なし / pending: 保存待ち・保存中 / saved: 保存済み / error: 保存に失敗 */
export type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

/**
 * 入力を少し待ってから自動で保存する。
 * 1文字ごとに保存するとデータベースへの書き込みが多くなるので、入力が止まってから保存する。
 * 画面を離れるとき・タブを裏に回すときは、待たずにすぐ保存する（入力した内容を失わないため）
 */
export function useAutoSave<T>(save: (value: T) => Promise<void>, delayMs = 1000) {
  const [status, setStatus] = useState<SaveStatus>('idle');

  // まだ保存していない最新の値。null なら保存待ちはない
  const pendingRef = useRef<{ value: T } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  // save は描画のたびに作り直されることがあるので、常に最新のものを呼べるようにしておく
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  /** 保存待ちの値があれば、待たずにすぐ保存する */
  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;

    saveRef.current(pending.value).then(
      // 保存している間に次の入力があった場合は、「保存待ち」の表示のままにする
      () => setStatus((current) => (pendingRef.current ? current : 'saved')),
      () => setStatus('error'),
    );
  }, []);

  /** 値が変わったことを知らせる。delayMs だけ入力が止まったら保存する */
  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      setStatus('pending');
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, delayMs);
    },
    [flush, delayMs],
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // ほかの画面へ移動するとき
      flush();
    };
  }, [flush]);

  return { status, schedule, flush };
}
