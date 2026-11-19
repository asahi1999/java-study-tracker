import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { type Toast, useToastStore } from '@/stores/toastStore';

/** 通知を出しておく時間（ミリ秒）。カーソルを合わせている間・フォーカスがある間は止める */
export const TOAST_DURATION_MS = 6000;

/**
 * 通知（トースト）を出す場所。全画面で1つだけ置く。
 * スマホは下部タブとタイマーの上、PCは右下（PCのタイマーはサイドバーにあるので重ならない）
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <section
      aria-label="通知"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(8rem+env(safe-area-inset-bottom))] z-50 md:inset-x-auto md:bottom-5 md:right-6 md:w-80"
    >
      {/* 読み上げの通知領域は、中身が入る前から置いておく必要がある */}
      <ol aria-live="polite" className="flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ol>
    </section>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const [paused, setPaused] = useState(false);
  const Icon = toast.icon;

  // 一定時間で消す。読んでいる途中（カーソル・フォーカスがある間）は消さない
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismiss(toast.id), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [paused, toast.id, dismiss]);

  return (
    <li
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      className="on-board pointer-events-auto flex animate-modal-in items-start gap-3 rounded-md border border-board-line bg-board p-4 text-board-ink shadow-2xl"
    >
      {Icon && (
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-board-muted">{toast.description}</p>
        )}
        {toast.action && (
          <Link
            to={toast.action.to}
            onClick={() => dismiss(toast.id)}
            className="mt-2 inline-block rounded text-[13px] font-bold text-accent underline underline-offset-2"
          >
            {toast.action.label}
          </Link>
        )}
      </div>
      <button
        type="button"
        aria-label="通知を閉じる"
        onClick={() => dismiss(toast.id)}
        className="-mr-1.5 -mt-1.5 grid size-8 shrink-0 place-items-center rounded text-board-muted transition-colors hover:bg-white/10 hover:text-board-ink"
      >
        <X aria-hidden className="size-4" />
      </button>
    </li>
  );
}
