import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';

import { setToday } from '../../tests/time';
import { RoadmapPage } from './RoadmapPage';

function renderPage(path = '/roadmap') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/roadmap/:weekId" element={<p>週の詳細の画面</p>} />
        <Route path="/editor" element={<p>ロードマップ編集の画面</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 「1ヶ月目」などの見出しを持つ区画を探す */
function findSection(name: string) {
  return screen.findByRole('region', { name });
}

describe('RoadmapPage', () => {
  beforeEach(async () => {
    // 学習開始日（11/16・月）の2日後。1週目の途中
    setToday('2026-11-18');
    await seedIfEmpty('2026-11-16');
  });

  describe('月ごとの表示', () => {
    it('3つの月と、それぞれのマイルストーンを表示する', async () => {
      renderPage();

      const month1 = await findSection('1ヶ月目');
      expect(
        within(month1).getByText('基本文法とHTML/CSSを使って、小さなアプリを最後まで作れる'),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: '2ヶ月目' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: '3ヶ月目' })).toBeInTheDocument();
    });

    it('月ごとに、その月の週を並べる', async () => {
      renderPage();

      const month1 = await findSection('1ヶ月目');
      const titles = within(month1)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);

      expect(titles).toEqual([
        '1週目 数当てゲーム',
        '2週目 じゃんけんゲーム（勝敗を記録）',
        '3週目 自己紹介ページ',
        '4週目 コンソール版ToDoリスト',
      ]);
    });

    it('週ごとに、ステップ名・予定期間・状態・進捗を表示する', async () => {
      await db.skills.update('week-01-skill-1', { checked: true, checkedAt: '2026-11-17' });
      await db.skills.update('week-01-skill-2', { checked: true, checkedAt: '2026-11-18' });
      await db.weeks.update('week-01', { status: 'in_progress', startedAt: '2026-11-17' });
      renderPage();

      const month1 = await findSection('1ヶ月目');
      const row = within(month1).getAllByRole('listitem')[0]!;

      expect(within(row).getByText(/① Javaの基礎/)).toBeInTheDocument();
      expect(within(row).getByText(/予定 11\/16〜11\/22/)).toBeInTheDocument();
      expect(within(row).getByText('進行中')).toBeInTheDocument();
      expect(within(row).getByRole('progressbar', { name: '1週目の進捗' })).toHaveAttribute(
        'aria-valuenow',
        '33',
      );
      expect(row).toHaveTextContent('2 / 6 項目');
    });

    it('今日が予定期間に入っている週にだけ「今週」と表示する', async () => {
      renderPage();

      const month1 = await findSection('1ヶ月目');

      expect(within(month1).getAllByText('今週')).toHaveLength(1);
      expect(within(within(month1).getAllByRole('listitem')[0]!).getByText('今週')).toBeVisible();
    });

    it('予定終了日を過ぎた未完成の週を「遅れ」と表示する', async () => {
      setToday('2026-11-25');
      renderPage();

      const month1 = await findSection('1ヶ月目');
      const rows = within(month1).getAllByRole('listitem');

      expect(within(rows[0]!).getByText('遅れ')).toBeInTheDocument();
      expect(within(rows[1]!).getByText('未着手')).toBeInTheDocument();
    });

    it('月の週がすべて完成したら「達成」と表示する', async () => {
      await db.weeks.where('monthId').equals('month-1').modify({ status: 'done' });
      renderPage();

      const month1 = await findSection('1ヶ月目');

      expect(within(month1).getByText('達成')).toBeInTheDocument();
      expect(
        within(screen.getByRole('region', { name: '2ヶ月目' })).queryByText('達成'),
      ).not.toBeInTheDocument();
    });

    it('月の進捗を表示する', async () => {
      await db.skills.where('weekId').equals('week-01').modify({ checked: true });
      renderPage();

      const month1 = await findSection('1ヶ月目');

      // 1ヶ月目は15項目で、1週目の6項目が終わっている
      expect(within(month1).getByRole('progressbar', { name: '1ヶ月目の進捗' })).toHaveAttribute(
        'aria-valuenow',
        '40',
      );
      expect(month1).toHaveTextContent('6 / 15 項目');
    });

    it('GitHubのURLを登録した週には、別のタブで開くリンクを表示する', async () => {
      await db.weeks.update('week-01', { repoUrl: 'https://github.com/asahi1999/number-guess' });
      renderPage();

      const link = await screen.findByRole('link', { name: 'GitHub' });

      expect(link).toHaveAttribute('href', 'https://github.com/asahi1999/number-guess');
      expect(link).toHaveAttribute('target', '_blank');
      expect(screen.getAllByRole('link', { name: 'GitHub' })).toHaveLength(1);
    });

    it('週を押すと、その週の詳細へ移動する', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('link', { name: '1週目 数当てゲーム' }));

      expect(screen.getByText('週の詳細の画面')).toBeInTheDocument();
    });
  });

  describe('ステップごとの表示', () => {
    it('8つのステップを番号つきで表示する', async () => {
      renderPage('/roadmap?view=step');

      expect(await findSection('① Javaの基礎')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: '⑧ Webアプリの実開発' })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(8);
    });

    it('ステップごとに、そのステップの週と月の名前を並べる', async () => {
      renderPage('/roadmap?view=step');

      const step5 = await findSection('⑤ データベース（SQL）');
      const rows = within(step5).getAllByRole('listitem');

      expect(rows).toHaveLength(2);
      expect(within(rows[0]!).getByText(/2ヶ月目/)).toBeInTheDocument();
    });

    it('学ぶ内容とアドバイスを折りたたみの中に持つ', async () => {
      const user = userEvent.setup();
      renderPage('/roadmap?view=step');
      const step1 = await findSection('① Javaの基礎');
      const details = within(step1).getByText('学ぶ内容とアドバイス').closest('details')!;
      expect(details).not.toHaveAttribute('open');

      await user.click(within(step1).getByText('学ぶ内容とアドバイス'));

      expect(details).toHaveAttribute('open');
      expect(
        within(details).getByText('基本構文、データ型、制御構文（if・for・while）'),
      ).toBeInTheDocument();
      expect(within(details).getByText('基本の書き方を確実に身につける')).toBeInTheDocument();
    });

    it('ステップの進捗を表示する', async () => {
      await db.skills.where('weekId').equals('week-07').modify({ checked: true });
      renderPage('/roadmap?view=step');

      const step5 = await findSection('⑤ データベース（SQL）');

      // ステップ⑤は8項目で、7週目の6項目が終わっている
      expect(step5).toHaveTextContent('6 / 8 項目');
    });
  });

  describe('並べ方の切り替え', () => {
    it('最初は「月ごと」が選ばれている', async () => {
      renderPage();
      await findSection('1ヶ月目');
      const toggle = screen.getByRole('group', { name: '並べ方' });

      expect(within(toggle).getByRole('link', { name: '月ごと' })).toHaveAttribute(
        'aria-current',
        'true',
      );
      expect(within(toggle).getByRole('link', { name: 'ステップごと' })).not.toHaveAttribute(
        'aria-current',
      );
    });

    it('「ステップごと」を押すと並べ方が変わり、「月ごと」で元に戻る', async () => {
      const user = userEvent.setup();
      renderPage();
      await findSection('1ヶ月目');

      await user.click(screen.getByRole('link', { name: 'ステップごと' }));
      expect(await findSection('① Javaの基礎')).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: '1ヶ月目' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: '月ごと' }));
      expect(await findSection('1ヶ月目')).toBeInTheDocument();
    });
  });

  it('ゴールを表示する', async () => {
    renderPage();

    expect(
      screen.getByText('ゴール：ブラウザで使える単語帳アプリ（Spring Boot＋DB）をGitHubに公開する'),
    ).toBeInTheDocument();
  });

  it('週が1つもなければ、ロードマップ編集へ案内する', async () => {
    const user = userEvent.setup();
    await db.weeks.clear();
    renderPage();

    expect(await screen.findByText('週がまだありません')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'ロードマップ編集を開く' }));

    expect(screen.getByText('ロードマップ編集の画面')).toBeInTheDocument();
  });
});
