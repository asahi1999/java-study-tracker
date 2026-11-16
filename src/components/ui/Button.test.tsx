import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, buttonClassName } from './Button';

describe('Button', () => {
  it('押すと onClick を呼ぶ', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>保存</Button>);

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('無効のときは押しても onClick を呼ばない', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        保存
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('フォームの中に置いても、指定しない限り送信しない', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>キャンセル</Button>
        <Button type="submit">保存</Button>
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Enterキーでも押せる', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>保存</Button>);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('buttonClassName', () => {
  it('種類ごとにちがうクラス名を返す', () => {
    const primary = buttonClassName({ variant: 'primary' });
    const danger = buttonClassName({ variant: 'danger' });

    expect(primary).not.toBe(danger);
  });

  it('追加のクラス名を末尾に付ける', () => {
    expect(buttonClassName({ className: 'w-full' })).toMatch(/ w-full$/);
  });
});
