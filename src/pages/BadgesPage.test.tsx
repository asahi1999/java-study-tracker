import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { db } from '@/db/database';

import { BadgesPage } from './BadgesPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <BadgesPage />
    </MemoryRouter>,
  );
}

/** 「2 / 16 獲得」のような、獲得した数の表示 */
function getSummary() {
  return screen.getByText(
    (_, element) => element?.tagName === 'P' && /\/ 16 獲得$/.test(element.textContent ?? ''),
  );
}

/** バッジ名の行（li）を探す */
async function findBadge(name: string) {
  const label = await screen.findByText(name);
  const item = label.closest('li');
  if (!item) throw new Error(`${name} の行が見つかりません`);
  return item;
}

describe('BadgesPage', () => {
  it('16個のバッジを、獲得していなくても条件つきで表示する', async () => {
    renderPage();

    await findBadge('はじめの一歩');
    expect(screen.getAllByRole('listitem')).toHaveLength(16);
    const badge = await findBadge('予定どおり');
    expect(badge).toHaveTextContent('遅れなしで1ヶ月分を完成');
    expect(badge).toHaveTextContent('未獲得');
  });

  it('獲得したバッジには、獲得した日を表示する', async () => {
    await db.badges.add({ id: 'first-log', earnedAt: new Date(2026, 10, 18, 10).toISOString() });
    renderPage();

    const badge = await findBadge('はじめの一歩');
    expect(badge).toHaveTextContent('11月18日（水）に獲得');
    expect(badge).not.toHaveTextContent('未獲得');
  });

  it('獲得した数を表示する', async () => {
    await db.badges.bulkAdd([
      { id: 'first-log', earnedAt: '2026-11-18T01:00:00.000Z' },
      { id: 'streak-3', earnedAt: '2026-11-18T01:00:00.000Z' },
    ]);
    renderPage();

    await findBadge('はじめの一歩');
    expect(getSummary()).toHaveTextContent('2 / 16 獲得');
  });

  it('定義の順に並べ、獲得しても並びは変えない', async () => {
    await db.badges.add({ id: 'complete', earnedAt: '2026-11-18T01:00:00.000Z' });
    renderPage();

    await findBadge('はじめの一歩');
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByText('はじめの一歩')).toBeInTheDocument();
    expect(within(items[15]!).getByText('ロードマップ完走')).toBeInTheDocument();
  });

  it('定義にない古いバッジが残っていても、表示や数に入れない', async () => {
    await db.badges.add({ id: 'removed-badge', earnedAt: '2026-11-18T01:00:00.000Z' });
    renderPage();

    await findBadge('はじめの一歩');
    expect(screen.getAllByRole('listitem')).toHaveLength(16);
    expect(getSummary()).toHaveTextContent('0 / 16 獲得');
  });
});
