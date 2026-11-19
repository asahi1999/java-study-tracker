import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';

import { buildLog } from '../../tests/factories';
import { setToday } from '../../tests/time';
import { StatsPage } from './StatsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>,
  );
}

/** 「予定と実績」などの見出しを持つカードを探す */
function findCard(name: string) {
  return screen.findByRole('region', { name });
}

/** 表の行を「行の見出し → セルの文字」の形で取り出す（列の見出しの行は除く） */
function rowsOf(table: HTMLElement): Record<string, string[]> {
  return Object.fromEntries(
    within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => {
        const [header, ...cells] = [...row.querySelectorAll('th, td')];
        return [header?.textContent ?? '', cells.map((cell) => cell.textContent ?? '')];
      }),
  );
}

/** 指定した週の項目を、先頭から count 個チェック済みにする */
async function checkSkills(weekId: string, count: number, checkedAt: string) {
  const skills = await db.skills.where('weekId').equals(weekId).sortBy('order');
  await Promise.all(
    skills.slice(0, count).map((skill) => db.skills.update(skill.id, { checked: true, checkedAt })),
  );
}

describe('StatsPage', () => {
  // 学習開始日は 2026-11-16（月）
  const START = '2026-11-16';

  describe('ログもチェックもないとき', () => {
    beforeEach(async () => {
      setToday('2026-11-18');
      await seedIfEmpty(START);
    });

    it('累計と平均は 0分で表示する', async () => {
      renderPage();

      const text = (await screen.findByText('累計の学習時間')).closest('dl')?.textContent;
      expect(text).toContain('累計の学習時間0分');
      expect(text).toContain('平均（1日あたり）0分');
      expect(text).toContain('平均（学習した日あたり）0分');
      // 開始日（11/16）から今日（11/18）までの3日
      expect(text).toContain('開始から 3日');
    });

    it('予定と実績は、実績 0% と今日の時点の予定を表示する', async () => {
      renderPage();

      const card = await findCard('予定と実績');
      // 1週目（予定 15%）の 3/7 の位置なので、予定は約 6%
      expect(card).toHaveTextContent('実績 0%／予定 6%');
      expect(card).toHaveTextContent('予定より遅れています。');
    });

    it('グラフの代わりに、次にすることを案内する', async () => {
      renderPage();

      expect(await findCard('週別の学習時間')).toHaveTextContent(
        '学習ログを記録すると、週ごとの学習時間がここに棒グラフで出ます。',
      );
      expect(await findCard('ステップ別の学習時間')).toHaveTextContent(
        '学習ログを記録すると、どのステップに時間を使ったかがここに出ます。',
      );
    });

    it('学習カレンダーは、開始日から最終週の予定終了日までを表示する', async () => {
      renderPage();

      const card = await findCard('学習カレンダー');
      expect(
        within(card).getByRole('group', {
          name: '11月16日（月）から2月7日（日）までの学習カレンダー。学習した日は0日',
        }),
      ).toBeInTheDocument();
      // 今日までの日は時間つき、これからの日は日付だけ
      expect(within(card).getByRole('button', { name: '11月16日（月）：0分' })).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: '11月19日（木）' })).toBeInTheDocument();
      // 12週間（84日）すべてのマスがある
      expect(within(card).getAllByRole('button')).toHaveLength(84);
    });
  });

  describe('学習ログがあるとき', () => {
    beforeEach(async () => {
      // 11/25 は2週目の3日目。開始から10日
      setToday('2026-11-25');
      await seedIfEmpty(START);
      await db.logs.bulkAdd([
        buildLog({ id: 'l1', date: '2026-11-16', minutes: 60, weekId: 'week-01' }),
        buildLog({ id: 'l2', date: '2026-11-16', minutes: 30, weekId: 'week-01' }),
        buildLog({ id: 'l3', date: '2026-11-18', minutes: 90, weekId: 'week-01' }),
        buildLog({ id: 'l4', date: '2026-11-20', minutes: 45, weekId: 'week-03' }),
        buildLog({ id: 'l5', date: '2026-11-25', minutes: 75, weekId: null }),
      ]);
    });

    it('累計・1日あたりの平均・学習した日あたりの平均を表示する', async () => {
      renderPage();

      const text = (await screen.findByText('累計の学習時間')).closest('dl')?.textContent;
      // 合計300分。10日で割ると30分、学習した4日で割ると75分
      expect(text).toContain('累計の学習時間5時間');
      expect(text).toContain('学習した日 4日');
      expect(text).toContain('平均（1日あたり）30分');
      expect(text).toContain('開始から 10日');
      expect(text).toContain('平均（学習した日あたり）1時間15分');
    });

    it('週別の学習時間を、月曜始まりの週ごとに集計する', async () => {
      renderPage();

      const card = await findCard('週別の学習時間');
      expect(card).toHaveTextContent('点線は週の目標 9時間');
      expect(rowsOf(within(card).getByRole('table', { name: '週別の学習時間' }))).toEqual({
        '11/16〜11/22': ['3時間45分'],
        '11/23〜11/29': ['1時間15分'],
      });
    });

    it('ステップ別の学習時間と割合を、ステップの順に表示する', async () => {
      renderPage();

      const card = await findCard('ステップ別の学習時間');
      const items = within(card).getAllByRole('listitem');
      // 8ステップ＋「週の指定なし」
      expect(items).toHaveLength(9);
      // 1週目はステップ①、3週目はステップ②
      expect(items[0]).toHaveTextContent('① Javaの基礎');
      expect(items[0]).toHaveTextContent('3時間60%');
      expect(items[1]).toHaveTextContent('② HTML・CSS');
      expect(items[1]).toHaveTextContent('45分15%');
      expect(items[2]).toHaveTextContent('0分0%');
      expect(items[8]).toHaveTextContent('週の指定なし');
      expect(items[8]).toHaveTextContent('1時間15分25%');
    });

    it('学習カレンダーのマスに、その日の合計時間を入れる', async () => {
      renderPage();

      const card = await findCard('学習カレンダー');
      const cell = (name: string) => within(card).getByRole('button', { name });
      expect(cell('11月16日（月）：1時間30分')).toHaveClass('bg-heat-3');
      expect(cell('11月17日（火）：0分')).toHaveClass('bg-heat-0');
      expect(cell('11月20日（金）：45分')).toHaveClass('bg-heat-2');
      expect(within(card).getByRole('group', { name: /学習した日は4日$/ })).toBeInTheDocument();
    });

    it('マスにカーソルを合わせると、その日の日付と学習時間を表示する', async () => {
      renderPage();
      const card = await findCard('学習カレンダー');
      expect(card).toHaveTextContent(
        'マスにカーソルを合わせる・押す・矢印キーで選ぶと、その日の学習時間が出ます。',
      );

      await userEvent.hover(
        within(card).getByRole('button', { name: '11月18日（水）：1時間30分' }),
      );

      expect(within(card).getByText('11月18日（水）：1時間30分')).toBeInTheDocument();
    });

    it('マスを押しても、その日の日付と学習時間を表示する（スマホ向け）', async () => {
      renderPage();
      const card = await findCard('学習カレンダー');

      await userEvent.click(within(card).getByRole('button', { name: '11月20日（金）：45分' }));

      expect(within(card).getByText('11月20日（金）：45分')).toBeInTheDocument();
    });
  });

  describe('学習カレンダーのキーボード操作', () => {
    beforeEach(async () => {
      // 11/18（水）は1週目の3日目
      setToday('2026-11-18');
      await seedIfEmpty(START);
      await db.logs.bulkAdd([
        buildLog({ id: 'l1', date: '2026-11-16', minutes: 90, weekId: 'week-01' }),
        buildLog({ id: 'l2', date: '2026-11-17', minutes: 20, weekId: 'week-01' }),
        buildLog({ id: 'l3', date: '2026-11-18', minutes: 45, weekId: 'week-01' }),
      ]);
    });

    /** カレンダーのカードと、下に出る欄の文字を返す */
    async function setup() {
      renderPage();
      const card = await findCard('学習カレンダー');
      const shown = () => card.querySelector('p[aria-hidden]')?.textContent ?? '';
      return { card, shown };
    }

    it('Tab で入れるのは1マスだけで、最初は今日のマス', async () => {
      const { card } = await setup();

      const reachable = within(card)
        .getAllByRole('button')
        .filter((button) => button.tabIndex === 0);
      expect(reachable).toHaveLength(1);
      expect(reachable[0]).toHaveAccessibleName('11月18日（水）：45分');
      expect(reachable[0]).toHaveAttribute('aria-current', 'date');
    });

    it('Tab でマスに入ると、その日の日付と学習時間を出す', async () => {
      const { card, shown } = await setup();

      await userEvent.tab();

      expect(within(card).getByRole('button', { name: '11月18日（水）：45分' })).toHaveFocus();
      expect(shown()).toBe('11月18日（水）：45分');
    });

    it('上下の矢印キーで1日ずつ動く', async () => {
      const { card, shown } = await setup();
      await userEvent.tab();

      await userEvent.keyboard('{ArrowUp}');
      expect(within(card).getByRole('button', { name: '11月17日（火）：20分' })).toHaveFocus();
      expect(shown()).toBe('11月17日（火）：20分');

      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      expect(within(card).getByRole('button', { name: '11月19日（木）' })).toHaveFocus();
      // 記録のない、これからの日は日付だけ
      expect(shown()).toBe('11月19日（木）');
    });

    it('左右の矢印キーで1週ずつ動く', async () => {
      const { card } = await setup();
      await userEvent.tab();

      await userEvent.keyboard('{ArrowRight}');
      expect(within(card).getByRole('button', { name: '11月25日（水）' })).toHaveFocus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(within(card).getByRole('button', { name: '11月18日（水）：45分' })).toHaveFocus();
    });

    it('Home と End で、最初と最後の日に動く', async () => {
      const { card } = await setup();
      await userEvent.tab();

      await userEvent.keyboard('{End}');
      expect(within(card).getByRole('button', { name: '2月7日（日）' })).toHaveFocus();

      await userEvent.keyboard('{Home}');
      expect(within(card).getByRole('button', { name: '11月16日（月）：1時間30分' })).toHaveFocus();
    });

    it('期間の外へは動かない', async () => {
      const { card } = await setup();
      await userEvent.tab();
      await userEvent.keyboard('{Home}');

      // 最初の日（11/16）から、前の日・前の週へは動けない
      await userEvent.keyboard('{ArrowUp}{ArrowLeft}');

      expect(within(card).getByRole('button', { name: '11月16日（月）：1時間30分' })).toHaveFocus();
    });

    it('動いた先のマスが、次に Tab で入るマスになる', async () => {
      const { card } = await setup();
      await userEvent.tab();
      await userEvent.keyboard('{ArrowUp}');

      const reachable = within(card)
        .getAllByRole('button')
        .filter((button) => button.tabIndex === 0);
      expect(reachable).toHaveLength(1);
      expect(reachable[0]).toHaveAccessibleName('11月17日（火）：20分');
    });

    it('矢印キーの操作方法を、読み上げ用の説明として持つ', async () => {
      const { card } = await setup();

      expect(within(card).getByRole('group')).toHaveAccessibleDescription(
        '上下の矢印キーで1日、左右の矢印キーで1週移動します。',
      );
    });

    it('ページで最初に Tab で止まるのは、カレンダーのマス', async () => {
      // グラフ自体には Tab で止まらない（同じ内容は表で読める）。
      // テスト環境ではグラフの大きさが0で描かれないので、グラフの確認はブラウザで行う
      renderPage();
      await findCard('学習カレンダー');

      await userEvent.tab();

      expect(document.activeElement).toHaveAccessibleName('11月18日（水）：45分');
    });
  });

  describe('予定と実績', () => {
    it('週ごとの予定と実績を表にして、進んでいるか遅れているかを伝える', async () => {
      setToday('2026-11-25');
      await seedIfEmpty(START);
      // 1週目に6項目、2週目に入って4項目チェックした（40項目のうち10項目）
      await checkSkills('week-01', 6, '2026-11-20');
      await checkSkills('week-02', 3, '2026-11-24');
      await checkSkills('week-03', 1, '2026-11-24');
      renderPage();

      const card = await findCard('予定と実績');
      // 予定は 15% → 22.5% の 3/7 の位置で約 18%
      expect(card).toHaveTextContent('実績 25%／予定 18%');
      expect(card).toHaveTextContent('予定より進んでいます。');

      const rows = rowsOf(within(card).getByRole('table', { name: '週ごとの累計進捗率' }));
      expect(rows['開始前']).toEqual(['0%', '0%']);
      expect(rows['1週目の終わり']).toEqual(['15%', '15%']);
      // 2週目はまだ途中なので、実績は「今日」の行に出る
      expect(rows['2週目の終わり']).toEqual(['22.5%', 'まだ']);
      expect(rows['12週目の終わり']).toEqual(['100%', 'まだ']);
      expect(rows['今日']).toEqual(['18.2%', '25%']);
    });

    it('開始前は、予定の数字を出さずに開始前であることを伝える', async () => {
      setToday('2026-11-10');
      await seedIfEmpty(START);
      renderPage();

      const card = await findCard('予定と実績');
      expect(card).toHaveTextContent('実績 0%');
      expect(card).not.toHaveTextContent('予定 0%');
      expect(card).toHaveTextContent('学習開始日の前です。');
    });

    it('週が1つもなければ、週の追加を案内する', async () => {
      setToday('2026-11-18');
      await seedIfEmpty(START);
      await db.skills.clear();
      await db.weeks.clear();
      renderPage();

      const card = await findCard('予定と実績');
      expect(card).toHaveTextContent('週を追加すると、予定と実績の進み具合をここで比べられます。');
      expect(within(card).queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('休止期間があるとき', () => {
    it('平均（1日あたり）の分母から休止日を除き、カレンダーの終わりも後ろにずれる', async () => {
      setToday('2026-11-25');
      await seedIfEmpty(START);
      await db.settings.update('app', {
        breakPeriods: [{ id: 'b1', label: '休み', start: '2026-11-17', end: '2026-11-21' }],
      });
      await db.logs.add(
        buildLog({ id: 'l1', date: '2026-11-16', minutes: 300, weekId: 'week-01' }),
      );
      renderPage();

      const text = (await screen.findByText('累計の学習時間')).closest('dl')?.textContent;
      // 10日のうち5日が休止 → 300分 ÷ 5日
      expect(text).toContain('平均（1日あたり）1時間');
      expect(text).toContain('開始から 5日');

      // 最終週の予定終了日は 2/7 から5日ずれて 2/12
      const card = await findCard('学習カレンダー');
      expect(
        within(card).getByRole('group', { name: /から2月12日（金）まで/ }),
      ).toBeInTheDocument();
    });
  });
});
