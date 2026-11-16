import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';

import { buildLog } from '../../tests/factories';
import { setToday } from '../../tests/time';
import { DashboardPage } from './DashboardPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="*" element={<p>別の画面</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 「今週の予定」などの見出しを持つカードを探す */
function findCard(name: string) {
  return screen.findByRole('region', { name });
}

/** 指定した週のチェック項目を、先頭から count 個チェック済みにする */
async function checkSkills(weekId: string, count: number, checkedAt = '2026-11-16') {
  const skills = await db.skills.where('weekId').equals(weekId).sortBy('order');
  await Promise.all(
    skills.slice(0, count).map((skill) => db.skills.update(skill.id, { checked: true, checkedAt })),
  );
}

describe('DashboardPage', () => {
  // 学習開始日は 2026-11-16（月）。1週目は 11/16〜11/22
  const START = '2026-11-16';

  describe('はじめて開いたとき', () => {
    beforeEach(async () => {
      setToday('2026-11-18');
      await seedIfEmpty(START);
    });

    it('全体の進捗は 0% で、ゴール予定日までの残り日数を表示する', async () => {
      renderPage();

      const card = await findCard('全体の進捗');
      expect(within(card).getByRole('progressbar', { name: '全体の進捗' })).toHaveAttribute(
        'aria-valuenow',
        '0',
      );
      // ゴール予定日は 12週目の最終日（2027-02-07）。11/18 からは 81日後
      expect(card).toHaveTextContent('残り81日');
      expect(card).toHaveTextContent('ゴール予定日 2月7日（日）');
      expect(card).toHaveTextContent('チェック項目 0 / 40');
      expect(card).toHaveTextContent('完成した週 0 / 10');
    });

    it('今週の予定に、現在の週とまだチェックしていない項目を表示する', async () => {
      renderPage();

      const card = await findCard('今週の予定');
      expect(within(card).getByRole('heading', { name: '1週目 数当てゲーム' })).toBeInTheDocument();
      expect(card).toHaveTextContent('のこり6項目（全6項目）');
      expect(within(card).getAllByRole('listitem')).toHaveLength(6);
      expect(within(card).getByRole('link', { name: '1週目を開く' })).toHaveAttribute(
        'href',
        '/roadmap/week-01',
      );
    });

    it('学習時間は 0分で、目標と並べて表示する', async () => {
      renderPage();

      expect(await findCard('今日の学習時間')).toHaveTextContent('0分 / 目標 1時間');
      expect(await findCard('今週の学習時間')).toHaveTextContent('0分 / 目標 9時間');
    });

    it('連続学習は 0日で、今日学習すると1日目になると案内する', async () => {
      renderPage();

      const card = await findCard('連続学習');
      expect(card).toHaveTextContent('0日 / 最長 0日');
      expect(card).toHaveTextContent('今日学習すると1日目になります。');
    });

    it('遅れている週がなければ、警告を出さない', async () => {
      renderPage();

      await findCard('今週の予定');
      expect(screen.queryByText(/遅れている週/)).not.toBeInTheDocument();
    });

    it('月ごと・ステップごとの進捗を表示する', async () => {
      renderPage();

      const months = await findCard('月ごとの進捗');
      expect(within(months).getAllByRole('progressbar')).toHaveLength(3);
      expect(
        within(months).getByRole('progressbar', { name: '1ヶ月目の進捗' }),
      ).toBeInTheDocument();

      const steps = await findCard('ステップごとの進捗');
      expect(within(steps).getAllByRole('progressbar')).toHaveLength(8);
      expect(
        within(steps).getByRole('progressbar', { name: '① Javaの基礎の進捗' }),
      ).toBeInTheDocument();
    });

    it('学習ログとバッジがないときは、次にすることを案内する', async () => {
      renderPage();

      expect(await findCard('最近の学習ログ')).toHaveTextContent('学習ログはまだありません。');
      expect(await findCard('最近獲得したバッジ')).toHaveTextContent(
        '最初の学習ログを記録すると「はじめの一歩」を獲得できます。',
      );
    });

    it('休止期間が未登録なら、設定での登録を案内する', async () => {
      renderPage();

      const notice = await findCard('休止期間の案内');
      expect(within(notice).getByRole('link', { name: '設定で登録する' })).toHaveAttribute(
        'href',
        '/settings',
      );
    });

    it('進め方のルールを表示する', async () => {
      renderPage();

      const card = await findCard('進め方のルール');
      expect(within(card).getAllByRole('listitem')).toHaveLength(4);
      expect(card).toHaveTextContent('Gitは1週目から使う');
    });
  });

  describe('進捗があるとき', () => {
    beforeEach(async () => {
      setToday('2026-11-18');
      await seedIfEmpty(START);
    });

    it('チェックした項目の数から、全体・月・ステップの進捗率を計算する', async () => {
      // 1週目は6項目。40項目のうち4項目で 10%
      await checkSkills('week-01', 4);
      renderPage();

      const overall = await findCard('全体の進捗');
      expect(within(overall).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
      expect(overall).toHaveTextContent('チェック項目 4 / 40');

      // 1ヶ月目は1〜4週目（6＋3＋3＋3＝15項目）なので、4項目で 27%
      const months = await findCard('月ごとの進捗');
      expect(within(months).getByRole('progressbar', { name: '1ヶ月目の進捗' })).toHaveAttribute(
        'aria-valuenow',
        '27',
      );

      // ステップ①は1〜2週目（6＋3＝9項目）なので、4項目で 44%
      const steps = await findCard('ステップごとの進捗');
      expect(
        within(steps).getByRole('progressbar', { name: '① Javaの基礎の進捗' }),
      ).toHaveAttribute('aria-valuenow', '44');
    });

    it('今週の予定には、チェックしていない項目だけを出す', async () => {
      await checkSkills('week-01', 4);
      renderPage();

      const card = await findCard('今週の予定');
      expect(card).toHaveTextContent('のこり2項目（全6項目）');
      expect(within(card).getAllByRole('listitem')).toHaveLength(2);
    });

    it('すべてチェックしたら、週を開いて完成にするよう案内する', async () => {
      await checkSkills('week-01', 6);
      renderPage();

      const card = await findCard('今週の予定');
      expect(card).toHaveTextContent('すべての項目をチェックしました。');
      expect(within(card).queryByRole('listitem')).not.toBeInTheDocument();
    });

    it('現在の週が完成していれば、完成したことを表示する', async () => {
      await checkSkills('week-01', 6);
      await db.weeks.update('week-01', { status: 'done', completedAt: '2026-11-18' });
      renderPage();

      const card = await findCard('今週の予定');
      expect(card).toHaveTextContent('この週は完成しました。');
      expect(await findCard('全体の進捗')).toHaveTextContent('完成した週 1 / 10');
    });
  });

  describe('学習ログがあるとき', () => {
    beforeEach(async () => {
      // 11/18 は水曜日。この週は 11/16（月）〜11/22（日）
      setToday('2026-11-18');
      await seedIfEmpty(START);
      await db.logs.bulkAdd([
        buildLog({ id: 'l1', date: '2026-11-15', minutes: 120, weekId: null, content: '下調べ' }),
        buildLog({
          id: 'l2',
          date: '2026-11-16',
          minutes: 30,
          weekId: 'week-01',
          content: '環境構築',
        }),
        buildLog({
          id: 'l3',
          date: '2026-11-17',
          minutes: 45,
          weekId: 'week-01',
          content: '変数と型',
        }),
        buildLog({
          id: 'l4',
          date: '2026-11-18',
          minutes: 50,
          weekId: 'week-01',
          content: '条件分岐',
          createdAt: '2026-11-18T09:00:00.000Z',
        }),
        buildLog({
          id: 'l5',
          date: '2026-11-18',
          minutes: 20,
          weekId: 'week-01',
          content: '繰り返し',
          createdAt: '2026-11-18T11:00:00.000Z',
        }),
      ]);
    });

    it('今日の学習時間を合計し、目標を超えたら「目標達成」を出す', async () => {
      renderPage();

      const card = await findCard('今日の学習時間');
      expect(card).toHaveTextContent('1時間10分 / 目標 1時間');
      expect(within(card).getByText('目標達成')).toBeInTheDocument();
      expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('今週の学習時間は、月曜日からの分だけを合計する', async () => {
      renderPage();

      // 11/15（日）の120分は前の週なので含めない。30＋45＋50＋20＝145分
      const card = await findCard('今週の学習時間');
      expect(card).toHaveTextContent('2時間25分 / 目標 9時間');
      expect(within(card).queryByText('目標達成')).not.toBeInTheDocument();
    });

    it('連続学習日数と最長記録を表示する', async () => {
      renderPage();

      const card = await findCard('連続学習');
      expect(card).toHaveTextContent('4日 / 最長 4日');
      expect(card).toHaveTextContent('今日の分は記録済みです。');
    });

    it('最近の学習ログを新しい順に3件だけ表示する', async () => {
      renderPage();

      const card = await findCard('最近の学習ログ');
      const items = within(card).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('繰り返し');
      expect(items[0]).toHaveTextContent('1週目 数当てゲーム');
      expect(items[1]).toHaveTextContent('条件分岐');
      expect(items[2]).toHaveTextContent('変数と型');
      expect(within(card).getByRole('link', { name: 'ログをすべて見る' })).toHaveAttribute(
        'href',
        '/logs',
      );
    });
  });

  describe('バッジを獲得しているとき', () => {
    it('最近獲得したバッジを新しい順に3件だけ表示する', async () => {
      setToday('2026-11-18');
      await seedIfEmpty(START);
      await db.badges.bulkAdd([
        { id: 'first-log', earnedAt: new Date(2026, 10, 16, 10).toISOString() },
        { id: 'first-done', earnedAt: new Date(2026, 10, 17, 10).toISOString() },
        { id: 'streak-3', earnedAt: new Date(2026, 10, 18, 10).toISOString() },
        { id: 'hours-10', earnedAt: new Date(2026, 10, 18, 11).toISOString() },
      ]);
      renderPage();

      const card = await findCard('最近獲得したバッジ');
      const items = within(card).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('10時間突破');
      expect(items[0]).toHaveTextContent('11月18日（水）');
      expect(items[1]).toHaveTextContent('三日坊主卒業');
      expect(items[2]).toHaveTextContent('初完成');
    });
  });

  describe('遅れている週があるとき', () => {
    it('警告に、遅れている週と超過した日数を表示する', async () => {
      // 2週目の3日目。1週目（〜11/22）が完成していない
      setToday('2026-11-25');
      await seedIfEmpty(START);
      renderPage();

      const warning = await findCard('遅れている週が1つあります');
      expect(within(warning).getByRole('link', { name: '1週目 数当てゲーム' })).toHaveAttribute(
        'href',
        '/roadmap/week-01',
      );
      expect(warning).toHaveTextContent('予定は11/22まで（3日超過）');
    });

    it('完成した週は、予定終了日を過ぎていても警告に出さない', async () => {
      setToday('2026-11-25');
      await seedIfEmpty(START);
      await db.weeks.update('week-01', { status: 'done', completedAt: '2026-11-22' });
      renderPage();

      await findCard('今週の予定');
      expect(screen.queryByText(/遅れている週/)).not.toBeInTheDocument();
    });
  });

  describe('現在の週が2つあるとき（11週目）', () => {
    it('両方の週を表示順に表示する', async () => {
      // 11週目の初日（開始日の70日後）
      setToday('2027-01-25');
      await seedIfEmpty(START);
      renderPage();

      const card = await findCard('今週の予定');
      const titles = within(card)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);
      expect(titles).toHaveLength(2);
      expect(titles[0]).toContain('11週目');
      expect(titles[1]).toContain('11〜12週目');
      expect(within(card).getByRole('link', { name: '11週目を開く' })).toBeInTheDocument();
      expect(within(card).getByRole('link', { name: '11〜12週目を開く' })).toBeInTheDocument();
    });
  });

  describe('現在の週がないとき', () => {
    it('開始前は、開始日と最初の週を案内する', async () => {
      setToday('2026-11-10');
      await seedIfEmpty(START);
      renderPage();

      const card = await findCard('今週の予定');
      expect(card).toHaveTextContent('学習は11月16日（月）から始まります。');
      expect(card).toHaveTextContent('次に取り組む週');
      expect(within(card).getByRole('heading', { name: '1週目 数当てゲーム' })).toBeInTheDocument();
    });

    it('休止中は、休止期間であることと次の未完成の週を案内する', async () => {
      // 1週目と2週目の間に休止期間を置く
      setToday('2026-11-24');
      await seedIfEmpty(START);
      await db.settings.update('app', {
        breakPeriods: [{ id: 'b1', label: '休み', start: '2026-11-23', end: '2026-11-25' }],
      });
      await db.weeks.update('week-01', { status: 'done', completedAt: '2026-11-22' });
      renderPage();

      const card = await findCard('今週の予定');
      expect(card).toHaveTextContent('今日は休止期間です。');
      expect(
        within(card).getByRole('heading', { name: '2週目 じゃんけんゲーム（勝敗を記録）' }),
      ).toBeInTheDocument();
      // 休止期間を登録済みなので、登録の案内は出さない
      expect(screen.queryByRole('region', { name: '休止期間の案内' })).not.toBeInTheDocument();
    });

    it('終了後は「◯日超過」を表示し、次の未完成の週を案内する', async () => {
      // ゴール予定日（2027-02-07）の3日後
      setToday('2027-02-10');
      await seedIfEmpty(START);
      renderPage();

      expect(await findCard('全体の進捗')).toHaveTextContent('3日超過');
      const card = await findCard('今週の予定');
      expect(card).toHaveTextContent('今日が予定期間に入っている週はありません。');
      expect(within(card).getByRole('heading', { name: '1週目 数当てゲーム' })).toBeInTheDocument();
    });

    it('すべての週が完成していれば「完走」と表示する', async () => {
      setToday('2027-02-10');
      await seedIfEmpty(START);
      await db.weeks.toCollection().modify({ status: 'done', completedAt: '2027-02-07' });
      renderPage();

      const overall = await findCard('全体の進捗');
      expect(overall).toHaveTextContent('完走');
      expect(overall).not.toHaveTextContent('超過');
      expect(await findCard('今週の予定')).toHaveTextContent('すべての週が完成しました。');
    });
  });

  describe('ゴール予定日の当日', () => {
    it('「今日が最終日」と表示する', async () => {
      setToday('2027-02-07');
      await seedIfEmpty(START);
      renderPage();

      expect(await findCard('全体の進捗')).toHaveTextContent('今日が最終日');
    });
  });

  describe('週が1つもないとき', () => {
    it('ロードマップ編集へ案内する', async () => {
      setToday('2026-11-18');
      await seedIfEmpty(START);
      await db.skills.clear();
      await db.weeks.clear();
      renderPage();

      const card = await findCard('今週の予定');
      expect(card).toHaveTextContent('週がまだありません');
      expect(within(card).getByRole('link', { name: 'ロードマップ編集を開く' })).toHaveAttribute(
        'href',
        '/editor',
      );
      // ゴール予定日が決まらないので、残り日数は出さない
      const overall = await findCard('全体の進捗');
      expect(overall).not.toHaveTextContent('残り');
      expect(overall).toHaveTextContent('完成した週 0 / 0');
    });
  });
});
