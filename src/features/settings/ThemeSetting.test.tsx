import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { settingsRepository } from '@/db/repositories';
import { createInitialSettings } from '@/db/seed';

import { ThemeSetting } from './ThemeSetting';

describe('ThemeSetting', () => {
  it('現在のテーマが選ばれた状態で表示する', async () => {
    await db.settings.add({ ...createInitialSettings('2026-11-16'), theme: 'dark' });

    render(<ThemeSetting />);

    expect(await screen.findByRole('radio', { name: 'ダーク' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'ライト' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'システムに合わせる' })).not.toBeChecked();
  });

  it('選んだテーマを設定に保存する', async () => {
    const user = userEvent.setup();
    await db.settings.add(createInitialSettings('2026-11-16'));
    render(<ThemeSetting />);

    await user.click(await screen.findByRole('radio', { name: 'ダーク' }));

    await waitFor(async () => expect((await settingsRepository.get())?.theme).toBe('dark'));
    expect(screen.getByRole('radio', { name: 'ダーク' })).toBeChecked();
  });

  it('キーボードだけでテーマを切り替えられる', async () => {
    const user = userEvent.setup();
    await db.settings.add({ ...createInitialSettings('2026-11-16'), theme: 'light' });
    render(<ThemeSetting />);
    await screen.findByRole('radio', { name: 'ライト' });

    await user.tab();
    await user.keyboard('{ArrowDown}');

    await waitFor(async () => expect((await settingsRepository.get())?.theme).toBe('dark'));
  });

  it('設定を読み込む前は何も表示しない', () => {
    const { container } = render(<ThemeSetting />);

    expect(container).toBeEmptyDOMElement();
  });
});
