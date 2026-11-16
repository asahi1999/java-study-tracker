import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(open = true) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open={open}
      title="学習ログを削除しますか？"
      confirmLabel="削除する"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p>削除すると元に戻せません。</p>
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('見出しと説明を表示する', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: '学習ログを削除しますか？' })).toBeInTheDocument();
    expect(screen.getByText('削除すると元に戻せません。')).toBeInTheDocument();
  });

  it('閉じている間は中身を表示しない', () => {
    renderDialog(false);

    expect(screen.queryByText('削除すると元に戻せません。')).not.toBeInTheDocument();
  });

  it('実行するボタンを押すと onConfirm を呼ぶ', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: '削除する' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('キャンセルを押すと onCancel を呼ぶ', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
