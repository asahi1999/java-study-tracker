import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { settingsRepository, weekRepository } from '@/db/repositories';
import { seedIfEmpty } from '@/db/seed';

import { setToday } from '../../../tests/time';
import { LineRail } from './LineRail';

function renderRail() {
  return render(
    <MemoryRouter>
      <LineRail />
    </MemoryRouter>,
  );
}

describe('LineRail', () => {
  beforeEach(() => {
    // 学習開始日（11/16・月）の2日後。1週目の途中
    setToday('2026-11-18');
  });

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

  it('今日が予定期間に入っている週には「今週」と付ける', async () => {
    await seedIfEmpty('2026-11-16');
    renderRail();

    expect(
      await screen.findByRole('link', { name: '1週目 数当てゲーム（未着手・今週）' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /今週/ })).toHaveLength(1);
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
    await screen.findByRole('link', { name: '1週目 数当てゲーム（未着手・今週）' });

    await weekRepository.update('week-01', { status: 'done' });

    expect(
      await screen.findByRole('link', { name: '1週目 数当てゲーム（完成・今週）' }),
    ).toBeInTheDocument();
  });

  it('予定終了日を過ぎた未完成の週は「遅れ」として示す', async () => {
    // 1週目の予定は 11/22 まで
    setToday('2026-11-25');
    await seedIfEmpty('2026-11-16');
    renderRail();

    expect(
      await screen.findByRole('link', { name: '1週目 数当てゲーム（遅れ）' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '2週目 じゃんけんゲーム（勝敗を記録）（未着手・今週）' }),
    ).toBeInTheDocument();
  });

  it('学習開始日を変えると、遅れの判定も変わる', async () => {
    setToday('2026-11-25');
    await seedIfEmpty('2026-11-16');
    renderRail();
    await screen.findByRole('link', { name: '1週目 数当てゲーム（遅れ）' });

    await settingsRepository.update({ startDate: '2026-11-23' });

    expect(
      await screen.findByRole('link', { name: '1週目 数当てゲーム（未着手・今週）' }),
    ).toBeInTheDocument();
  });

  it('週が1つもなければ、その旨を表示する', async () => {
    renderRail();

    expect(await screen.findByText('週がまだありません')).toBeInTheDocument();
  });
});
