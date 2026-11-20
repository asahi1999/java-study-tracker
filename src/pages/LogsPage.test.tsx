import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';

import { buildLog } from '../../tests/factories';
import { setToday } from '../../tests/time';
import { LogsPage } from './LogsPage';

function renderPage(path = '/logs') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * 件数と合計時間の表示を探す。
 * 読み込み中の表示も同じ役割（status）を持つので、「件」の文字が出るまで待つ
 */
async function findSummary() {
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('件'));
  return screen.getByRole('status');
}

/** 一覧の行（学習ログ1件分）を取り出す */
async function findRows() {
  await findSummary();
  return screen.queryAllByRole('listitem');
}

async function seedLogs() {
  await db.logs.bulkAdd([
    buildLog({
      id: 'l1',
      date: '2026-11-16',
      minutes: 30,
      weekId: 'week-01',
      content: '環境構築',
      source: 'manual',
    }),
    buildLog({
      id: 'l2',
      date: '2026-11-17',
      minutes: 45,
      weekId: 'week-01',
      content: '変数と型',
      source: 'timer',
    }),
    buildLog({
      id: 'l3',
      date: '2026-11-18',
      minutes: 60,
      weekId: 'week-03',
      content: 'HTMLの基本',
      source: 'timer',
    }),
    buildLog({
      id: 'l4',
      date: '2026-11-18',
      minutes: 20,
      weekId: null,
      content: '技術記事を読んだ',
      source: 'manual',
      createdAt: '2026-11-18T12:00:00.000Z',
    }),
  ]);
}

describe('LogsPage', () => {
  beforeEach(async () => {
    // 学習開始日（11/16・月）の2日後。1週目の途中
    setToday('2026-11-18');
    await seedIfEmpty('2026-11-16');
  });

  describe('ログがないとき', () => {
    it('記録の方法を案内し、追加ボタンを出す', async () => {
      renderPage();

      expect(await screen.findByText('学習ログはまだありません')).toBeInTheDocument();
      expect(screen.getByText(/画面右下のタイマーで計測すると/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ログを追加' })).toBeInTheDocument();
      // 絞り込みは、絞り込むものがないので出さない
      expect(screen.queryByRole('region', { name: '絞り込み' })).not.toBeInTheDocument();
    });
  });

  describe('一覧', () => {
    beforeEach(seedLogs);

    it('新しい順に、日付・週・時間・内容・記録の方法を表示する', async () => {
      renderPage();

      const rows = await findRows();
      expect(rows).toHaveLength(4);
      expect(rows[0]).toHaveTextContent('11月18日（水）');
      expect(rows[0]).toHaveTextContent('手動');
      expect(rows[0]).toHaveTextContent('週の指定なし');
      expect(rows[0]).toHaveTextContent('20分');
      expect(rows[0]).toHaveTextContent('技術記事を読んだ');
      expect(rows[1]).toHaveTextContent('3週目 自己紹介ページ');
      expect(rows[1]).toHaveTextContent('タイマー');
      expect(rows[1]).toHaveTextContent('1時間');
      expect(rows[3]).toHaveTextContent('11月16日（月）');
      expect(rows[3]).toHaveTextContent('1週目 数当てゲーム');
    });

    it('件数と合計時間を表示する', async () => {
      renderPage();

      // 30＋45＋60＋20＝155分
      expect(await findSummary()).toHaveTextContent('4件 ・ 合計 2時間35分');
    });
  });

  describe('絞り込み', () => {
    beforeEach(seedLogs);

    it('週で絞り込むと、その週のログと合計時間だけにする', async () => {
      renderPage();
      await findRows();

      await userEvent.selectOptions(screen.getByRole('combobox', { name: '週' }), 'week-01');

      expect(await findRows()).toHaveLength(2);
      expect(screen.getByRole('status')).toHaveTextContent(
        '2件 ・ 合計 1時間15分（全4件から絞り込み中）',
      );
    });

    it('「週の指定なし」で絞り込める', async () => {
      renderPage();
      await findRows();

      await userEvent.selectOptions(screen.getByRole('combobox', { name: '週' }), 'none');

      const rows = await findRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('技術記事を読んだ');
    });

    it('ステップで絞り込める', async () => {
      renderPage();
      await findRows();

      // ステップ②（HTML・CSS）は3週目
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'ステップ' }), 'step-2');

      const rows = await findRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('HTMLの基本');
    });

    it('期間を入力すると、その期間のログだけにする', async () => {
      renderPage();
      await findRows();

      await userEvent.type(screen.getByLabelText('期間（開始）'), '2026-11-18');
      expect(await findRows()).toHaveLength(2);

      await userEvent.type(screen.getByLabelText('期間（終了）'), '2026-11-17');
      // 開始より前の終了日は、条件に合うログがない
      expect(await screen.findByText(/条件に合う学習ログはありません/)).toBeInTheDocument();
    });

    it('URLの条件（期間）で絞り込んだ状態で開ける', async () => {
      renderPage('/logs?from=2026-11-17&to=2026-11-17');

      const rows = await findRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('変数と型');
      expect(screen.getByLabelText('期間（開始）')).toHaveValue('2026-11-17');
      expect(screen.getByLabelText('期間（終了）')).toHaveValue('2026-11-17');
    });

    it('条件に合うログがなければ、その旨を伝える', async () => {
      renderPage('/logs?week=week-08');

      expect(await findSummary()).toHaveTextContent('0件 ・ 合計 0分');
      expect(screen.getByText(/条件に合う学習ログはありません。/)).toBeInTheDocument();
    });

    it('「絞り込みを解除」で、すべてのログに戻す', async () => {
      renderPage('/logs?week=week-01&step=step-1');
      expect(await findRows()).toHaveLength(2);

      await userEvent.click(screen.getByRole('button', { name: '絞り込みを解除' }));

      expect(await findRows()).toHaveLength(4);
      expect(screen.getByRole('combobox', { name: '週' })).toHaveValue('');
      expect(screen.queryByRole('button', { name: '絞り込みを解除' })).not.toBeInTheDocument();
    });
  });

  describe('追加', () => {
    it('入力して追加すると、手動のログとして保存する', async () => {
      renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'ログを追加' }));
      const dialog = screen.getByRole('dialog', { name: '学習ログを追加' });

      // 日付の初期値は今日、週の初期値は今週
      expect(within(dialog).getByLabelText('学習した日')).toHaveValue('2026-11-18');
      expect(within(dialog).getByRole('combobox', { name: '週' })).toHaveValue('week-01');

      await userEvent.type(within(dialog).getByLabelText('学習時間（分）'), '90');
      await userEvent.type(within(dialog).getByLabelText('やったこと'), 'if文の練習');
      await userEvent.click(within(dialog).getByRole('button', { name: 'ログを追加' }));

      await waitFor(async () => expect(await db.logs.count()).toBe(1));
      expect((await db.logs.toArray())[0]).toMatchObject({
        date: '2026-11-18',
        minutes: 90,
        weekId: 'week-01',
        content: 'if文の練習',
        source: 'manual',
      });
      // 一覧に出て、ダイアログは閉じる
      expect(await screen.findByText('if文の練習')).toBeInTheDocument();
      expect(screen.queryByLabelText('学習時間（分）')).not.toBeInTheDocument();
    });

    it('未着手の週にログを追加すると、その週が「進行中」になる', async () => {
      renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'ログを追加' }));
      const dialog = screen.getByRole('dialog', { name: '学習ログを追加' });

      await userEvent.type(within(dialog).getByLabelText('学習時間（分）'), '30');
      await userEvent.click(within(dialog).getByRole('button', { name: 'ログを追加' }));

      await waitFor(async () =>
        expect(await db.weeks.get('week-01')).toMatchObject({
          status: 'in_progress',
          startedAt: '2026-11-18',
        }),
      );
    });

    it('学習時間が空のままでは保存せず、入力欄の下にエラーを出す', async () => {
      renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'ログを追加' }));
      const dialog = screen.getByRole('dialog', { name: '学習ログを追加' });

      await userEvent.click(within(dialog).getByRole('button', { name: 'ログを追加' }));

      const input = within(dialog).getByLabelText('学習時間（分）');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('学習時間を分単位の整数で入力してください');
      expect(await db.logs.count()).toBe(0);
    });

    it('1440分を超える学習時間はエラーにする', async () => {
      renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'ログを追加' }));
      const dialog = screen.getByRole('dialog', { name: '学習ログを追加' });

      await userEvent.type(within(dialog).getByLabelText('学習時間（分）'), '1441');
      await userEvent.click(within(dialog).getByRole('button', { name: 'ログを追加' }));

      expect(within(dialog).getByLabelText('学習時間（分）')).toHaveAccessibleDescription(
        '学習時間は1〜1440分で入力してください',
      );
      expect(await db.logs.count()).toBe(0);
    });

    it('キャンセルすると保存しない', async () => {
      renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'ログを追加' }));
      const dialog = screen.getByRole('dialog', { name: '学習ログを追加' });

      await userEvent.type(within(dialog).getByLabelText('学習時間（分）'), '30');
      await userEvent.click(within(dialog).getByRole('button', { name: 'キャンセル' }));

      expect(await db.logs.count()).toBe(0);
      expect(screen.queryByLabelText('学習時間（分）')).not.toBeInTheDocument();
    });
  });

  describe('編集', () => {
    beforeEach(seedLogs);

    it('いまの内容が入った状態で開き、変更を保存する', async () => {
      renderPage();
      const rows = await findRows();

      // rows[2] は 11/17 の「変数と型」（タイマーで記録）
      await userEvent.click(within(rows[2]!).getByRole('button', { name: '編集' }));
      const dialog = screen.getByRole('dialog', { name: '学習ログを編集' });
      const minutes = within(dialog).getByLabelText('学習時間（分）');
      expect(within(dialog).getByLabelText('学習した日')).toHaveValue('2026-11-17');
      expect(minutes).toHaveValue('45');
      expect(within(dialog).getByRole('combobox', { name: '週' })).toHaveValue('week-01');
      expect(within(dialog).getByLabelText('やったこと')).toHaveValue('変数と型');

      await userEvent.clear(minutes);
      await userEvent.type(minutes, '50');
      await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: '週' }), '');
      await userEvent.click(within(dialog).getByRole('button', { name: '変更を保存' }));

      await waitFor(async () => expect((await db.logs.get('l2'))?.minutes).toBe(50));
      // 記録の方法（タイマー）は、編集しても変えない
      expect(await db.logs.get('l2')).toMatchObject({ weekId: null, source: 'timer' });
      expect(await db.logs.count()).toBe(4);
    });
  });

  describe('削除', () => {
    beforeEach(seedLogs);

    it('確認ダイアログで「削除する」を押すと削除する', async () => {
      renderPage();
      const rows = await findRows();

      await userEvent.click(within(rows[0]!).getByRole('button', { name: '削除' }));
      const dialog = screen.getByRole('dialog', { name: '学習ログを削除しますか？' });
      expect(dialog).toHaveTextContent('11月18日（水） ・ 20分');
      expect(dialog).toHaveTextContent('技術記事を読んだ');
      expect(dialog).toHaveTextContent('削除すると元に戻せません。');
      // 確認の段階では、まだ削除しない
      expect(await db.logs.count()).toBe(4);

      await userEvent.click(within(dialog).getByRole('button', { name: '削除する' }));

      await waitFor(async () => expect(await db.logs.get('l4')).toBeUndefined());
      expect(await db.logs.count()).toBe(3);
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('3件 ・ 合計 2時間15分'),
      );
    });

    it('キャンセルすると削除しない', async () => {
      renderPage();
      const rows = await findRows();

      await userEvent.click(within(rows[0]!).getByRole('button', { name: '削除' }));
      await userEvent.click(
        within(screen.getByRole('dialog', { name: '学習ログを削除しますか？' })).getByRole(
          'button',
          { name: 'キャンセル' },
        ),
      );

      expect(await db.logs.count()).toBe(4);
    });
  });
});
