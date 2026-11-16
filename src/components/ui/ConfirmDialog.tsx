import type { ReactNode } from 'react';

import { Button } from './Button';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** 何が起きるかの説明 */
  children: ReactNode;
  /** 実行するボタンの文字（例：「削除する」）。何をするボタンかが分かる言葉にする */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 取り消せない操作の前に出す確認。実行するボタンは赤にする */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button onClick={onCancel}>キャンセル</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-2 text-sm leading-relaxed">{children}</div>
    </Modal>
  );
}
