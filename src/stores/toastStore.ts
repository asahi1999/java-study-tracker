import type { LucideIcon } from 'lucide-react';
import { create } from 'zustand';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  /** 通知から移れる画面（例：「実績バッジを見る」） */
  action?: { label: string; to: string };
  /** 見出しの左に出すアイコン */
  icon?: LucideIcon;
};

type ToastState = {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

/** 一度に画面に出しておく通知の上限。古いものから消す */
const MAX_TOASTS = 3;

/** 画面の端に出す短い通知（トースト）。表示する時間の管理は Toaster が受け持つ */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-MAX_TOASTS) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
