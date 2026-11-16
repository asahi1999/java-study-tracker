import { X } from 'lucide-react';
import { type MouseEvent, type ReactNode, useEffect, useId, useRef } from 'react';

type ModalProps = {
  open: boolean;
  /** 閉じるボタン・Escキー・背景のクリックのどれで閉じても呼ばれる */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 下部に並べる操作（「保存」「キャンセル」など） */
  footer?: ReactNode;
  /** center は画面中央、sheet は画面の下から出る（スマホのメニュー向け） */
  variant?: 'center' | 'sheet';
};

// dialog 要素そのものには display を指定しない。
// 閉じているときに非表示にするブラウザ標準のスタイルを打ち消してしまうため
const DIALOG_BASE =
  'bg-surface p-0 text-ink shadow-2xl backdrop:bg-[#050C1B]/60 open:animate-modal-in';

const DIALOG_VARIANTS = {
  center: 'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-md border border-line',
  sheet: 'mb-0 mt-auto w-full max-w-none rounded-t-xl border-t border-line',
};

export function Modal({ open, onClose, title, children, footer, variant = 'center' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // ブラウザ標準の dialog を使う。フォーカスを中に閉じ込める・Escで閉じる・
  // 閉じたら元のボタンにフォーカスを戻す、といった動きを自前で書かずに済むため
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // 中身の外側（暗い背景）をクリックしたときだけ閉じる。
  // 背景のクリックは dialog 要素自身がターゲットになる
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleBackdropClick}
      className={`${DIALOG_BASE} ${DIALOG_VARIANTS[variant]}`}
    >
      {/* 閉じている間は中身を描画しない。次に開いたとき、入力内容が残らないようにするため */}
      {open && (
        <div
          className={
            variant === 'sheet' ? 'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4' : 'p-5'
          }
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-base font-bold">
              {title}
            </h2>
            <button
              type="button"
              aria-label="閉じる"
              onClick={onClose}
              className="-mr-2 grid size-9 place-items-center rounded text-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {children}
          {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
