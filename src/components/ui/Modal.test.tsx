import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

describe('Modal', () => {
  it('閉じているときは中身を表示しない', () => {
    render(
      <Modal open={false} onClose={() => {}} title="ログを削除">
        <p>この操作は取り消せません。</p>
      </Modal>,
    );

    expect(screen.queryByText('この操作は取り消せません。')).not.toBeInTheDocument();
  });

  it('開くと、タイトルを名前に持つダイアログとして表示する', () => {
    render(
      <Modal
        open
        onClose={() => {}}
        title="ログを削除"
        footer={<button type="button">削除</button>}
      >
        <p>この操作は取り消せません。</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'ログを削除' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('この操作は取り消せません。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('閉じるボタンを押すと onClose を呼ぶ', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="ログを削除">
        <p>本文</p>
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: '閉じる' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('背景をクリックすると onClose を呼ぶ', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="ログを削除">
        <p>本文</p>
      </Modal>,
    );

    // 背景のクリックは dialog 要素自身に届く
    await user.click(screen.getByRole('dialog'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('中身をクリックしても閉じない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="ログを削除">
        <p>本文</p>
      </Modal>,
    );

    await user.click(screen.getByText('本文'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escキーなどでブラウザが閉じたときも onClose を呼ぶ', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="ログを削除">
        <p>本文</p>
      </Modal>,
    );

    // Escキーで閉じると、ブラウザは dialog に close イベントを送る
    fireEvent(screen.getByRole('dialog'), new Event('close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('open を false にするとダイアログを閉じる', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="ログを削除">
        <p>本文</p>
      </Modal>,
    );

    rerender(
      <Modal open={false} onClose={() => {}} title="ログを削除">
        <p>本文</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('本文')).not.toBeInTheDocument();
  });
});
