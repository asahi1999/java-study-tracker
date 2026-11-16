import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { weekRepository } from '@/db/repositories';
import { seedIfEmpty } from '@/db/seed';

import { LineRail } from './LineRail';

function renderRail() {
  return render(
    <MemoryRouter>
      <LineRail />
    </MemoryRouter>,
  );
}

describe('LineRail', () => {
  it('初期ロードマップの10週をリンクとして並べる', async () => {
    await seedIfEmpty('2026-11-16');
    renderRail();

    const rail = await screen.findByRole('navigation', { name: 'ロードマップの現在地' });

    expect(within(rail).getAllByRole('link')).toHaveLength(10);
  });

  it('週番号・作るもの・状態を読み上げ用の名前に入れる', async () => {
    await seedIfEmpty('2026-11-16');
    renderRail();

    const link = await screen.findByRole('link', {
      name: '5〜6週目 単語帳アプリ（ファイル保存）（未着手）',
    });

    expect(link).toHaveTextContent('5–6');
  });

  it('駅を押すとその週の詳細へ移動するリンクになっている', async () => {
    await seedIfEmpty('2026-11-16');
    renderRail();

    const link = await screen.findByRole('link', { name: /^1週目 数当てゲーム/ });

    expect(link).toHaveAttribute('href', '/roadmap/week-01');
  });

  it('11週目に並行する2つの週を両方表示する', async () => {
    await seedIfEmpty('2026-11-16');
    renderRail();

    expect(
      await screen.findByRole('link', { name: /^11週目 ブランチを切って機能追加/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^11〜12週目 単語帳を完成させて公開/ }),
    ).toBeInTheDocument();
  });

  it('週の状態が変わったら表示に反映する', async () => {
    await seedIfEmpty('2026-11-16');
    renderRail();
    await screen.findByRole('link', { name: '1週目 数当てゲーム（未着手）' });

    await weekRepository.update('week-01', { status: 'done' });

    expect(
      await screen.findByRole('link', { name: '1週目 数当てゲーム（完成）' }),
    ).toBeInTheDocument();
  });

  it('週が1つもなければ、その旨を表示する', async () => {
    renderRail();

    expect(await screen.findByText('週がまだありません')).toBeInTheDocument();
  });
});
