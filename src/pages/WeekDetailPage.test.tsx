import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';

import { buildLog } from '../../tests/factories';
import { setToday } from '../../tests/time';
import { WeekDetailPage } from './WeekDetailPage';

// 1週目（数当てゲーム）のチェック項目
const SKILL_LABELS = ['変数', 'データ型', 'if', 'for/while', 'Scanner', 'Random'];

function renderPage(weekId = 'week-01') {
  return render(
    <MemoryRouter initialEntries={[`/roadmap/${weekId}`]}>
      <Routes>
        <Route path="/roadmap" element={<p>ロードマップ一覧の画面</p>} />
        <Route path="/roadmap/:weekId" element={<WeekDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function getWeek() {
  return db.weeks.get('week-01');
}

/** 項目名からチェックボックスを探す（チェック後は名前に日付が付くので前方一致） */
function getSkillCheckbox(label: string) {
  const escaped = label.replace('/', '\\/');
  return screen.getByRole('checkbox', { name: new RegExp(`^${escaped}`) });
}

/** メモの入力欄を探す。カードの見出しも「メモ」という名前を持つので、入力欄に絞って探す */
function findMemoInput() {
  return screen.findByRole('textbox', { name: 'メモ' });
}

async function checkAllSkills(user: ReturnType<typeof userEvent.setup>) {
  for (const label of SKILL_LABELS) {
    await user.click(getSkillCheckbox(label));
    await waitFor(() => expect(getSkillCheckbox(label)).toBeChecked());
  }
}

describe('WeekDetailPage', () => {
  beforeEach(async () => {
    // 学習開始日（11/16・月）の2日後の水曜日
    setToday('2026-11-18');
    await seedIfEmpty('2026-11-16');
  });

  it('週番号・作るもの・状態・ステップ・月・予定期間を表示する', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: '1週目 数当てゲーム' }),
    ).toBeInTheDocument();
    expect(screen.getByText('未着手')).toBeInTheDocument();
    expect(screen.getByText('① Javaの基礎 ・ 1ヶ月目 ・ 予定 11/16〜11/22')).toBeInTheDocument();
  });

  it('ロードマップ一覧へ戻れる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('link', { name: 'ロードマップ' }));

    expect(screen.getByText('ロードマップ一覧の画面')).toBeInTheDocument();
  });

  it('存在しない週のURLでは、見つからないことを伝えて一覧へ案内する', async () => {
    const user = userEvent.setup();
    renderPage('no-such-week');

    expect(
      await screen.findByRole('heading', { level: 1, name: '週が見つかりません' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'ロードマップへ戻る' }));

    expect(screen.getByText('ロードマップ一覧の画面')).toBeInTheDocument();
  });

  describe('チェックリスト', () => {
    it('身につくことをチェック項目として表示する', async () => {
      renderPage();
      const card = await screen.findByRole('region', { name: '身につくこと' });

      expect(within(card).getAllByRole('checkbox')).toHaveLength(6);
      for (const label of SKILL_LABELS) {
        expect(getSkillCheckbox(label)).not.toBeChecked();
      }
      expect(card).toHaveTextContent('0 / 6 項目');
    });

    it('チェックすると保存し、チェックした日と進捗を表示する', async () => {
      const user = userEvent.setup();
      renderPage();
      const card = await screen.findByRole('region', { name: '身につくこと' });

      await user.click(getSkillCheckbox('変数'));

      await waitFor(() => expect(getSkillCheckbox('変数')).toBeChecked());
      expect(await db.skills.get('week-01-skill-1')).toMatchObject({
        checked: true,
        checkedAt: '2026-11-18',
      });
      expect(card).toHaveTextContent('1 / 6 項目');
      expect(within(card).getByText('11/18')).toBeInTheDocument();
      expect(within(card).getByRole('progressbar', { name: 'この週の進捗' })).toHaveAttribute(
        'aria-valuenow',
        '17',
      );
    });

    it('最初のチェックで、週を「進行中」にして開始日を入れる', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: '身につくこと' });

      await user.click(getSkillCheckbox('変数'));

      expect(await screen.findByText('進行中')).toBeInTheDocument();
      expect(await getWeek()).toMatchObject({ status: 'in_progress', startedAt: '2026-11-18' });
      expect(screen.getByLabelText('開始日')).toHaveValue('2026-11-18');
    });

    it('チェックを外せる', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: '身につくこと' });
      await user.click(getSkillCheckbox('変数'));
      await waitFor(() => expect(getSkillCheckbox('変数')).toBeChecked());

      await user.click(getSkillCheckbox('変数'));

      await waitFor(() => expect(getSkillCheckbox('変数')).not.toBeChecked());
      expect(await db.skills.get('week-01-skill-1')).toMatchObject({
        checked: false,
        checkedAt: null,
      });
    });

    it('キーボードだけでチェックできる', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: '身につくこと' });

      getSkillCheckbox('変数').focus();
      await user.keyboard(' ');

      await waitFor(() => expect(getSkillCheckbox('変数')).toBeChecked());
    });
  });

  describe('完成にする', () => {
    it('チェックが残っている間は押せず、あと何項目かを伝える', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: '身につくこと' });
      const button = screen.getByRole('button', { name: '完成にする' });

      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription('あと6項目チェックすると、完成にできます。');

      await user.click(getSkillCheckbox('変数'));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: '完成にする' })).toHaveAccessibleDescription(
          'あと5項目チェックすると、完成にできます。',
        ),
      );
      expect(screen.getByRole('button', { name: '完成にする' })).toBeDisabled();
    });

    it('すべてチェックすると押せるようになり、押すと「完成」になって完了日が入る', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: '身につくこと' });
      await checkAllSkills(user);
      const button = screen.getByRole('button', { name: '完成にする' });
      expect(button).toBeEnabled();
      expect(button).toHaveAccessibleDescription('すべての項目をチェックしました。');

      await user.click(button);

      expect(await screen.findByText('11月18日（水）に完成')).toBeInTheDocument();
      expect(await getWeek()).toMatchObject({ status: 'done', completedAt: '2026-11-18' });
      expect(screen.getByLabelText('完了日')).toHaveValue('2026-11-18');
    });

    it('完成にするとチェックリストを変更できなくなり、その理由を表示する', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: '身につくこと' });
      await checkAllSkills(user);

      await user.click(screen.getByRole('button', { name: '完成にする' }));

      await waitFor(() => expect(getSkillCheckbox('変数')).toBeDisabled());
      expect(
        screen.getByText(
          '完成にした週のチェックは変更できません。変更するには、完成を取り消してください。',
        ),
      ).toBeInTheDocument();
    });

    it('完成を取り消すと「進行中」に戻り、またチェックを変更できる', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: '身につくこと' });
      await checkAllSkills(user);
      await user.click(screen.getByRole('button', { name: '完成にする' }));

      await user.click(await screen.findByRole('button', { name: '完成を取り消す' }));

      expect(await screen.findByRole('button', { name: '完成にする' })).toBeEnabled();
      expect(await getWeek()).toMatchObject({ status: 'in_progress', completedAt: null });
      expect(getSkillCheckbox('変数')).toBeEnabled();
      expect(screen.queryByLabelText('完了日')).not.toBeInTheDocument();
    });

    it('チェック項目のない週は、そのまま完成にできる', async () => {
      const user = userEvent.setup();
      await db.skills.where('weekId').equals('week-01').delete();
      renderPage();

      const button = await screen.findByRole('button', { name: '完成にする' });
      expect(button).toHaveAccessibleDescription(
        'チェック項目がないので、いつでも完成にできます。',
      );
      await user.click(button);

      await waitFor(async () => expect((await getWeek())?.status).toBe('done'));
    });
  });

  describe('記録', () => {
    it('https://github.com/ で始まらないURLは保存せず、入力欄の下にエラーを表示する', async () => {
      const user = userEvent.setup();
      renderPage();
      const input = await screen.findByLabelText('GitHubリポジトリのURL');

      await user.type(input, 'https://example.com/number-guess');
      await user.click(screen.getByRole('button', { name: '保存' }));

      expect(input).toBeInvalid();
      expect(input).toHaveAccessibleDescription(
        'https://github.com/ で始まるURLを入力してください',
      );
      expect((await getWeek())?.repoUrl).toBe('');
    });

    it('正しいURLを保存すると、リンクとして開ける', async () => {
      const user = userEvent.setup();
      renderPage();
      const input = await screen.findByLabelText('GitHubリポジトリのURL');

      await user.type(input, 'https://github.com/asahi1999/number-guess');
      await user.click(screen.getByRole('button', { name: '保存' }));

      const link = await screen.findByRole('link', { name: 'GitHubで開く' });
      expect(link).toHaveAttribute('href', 'https://github.com/asahi1999/number-guess');
      expect(link).toHaveAttribute('target', '_blank');
      expect((await getWeek())?.repoUrl).toBe('https://github.com/asahi1999/number-guess');
    });

    it('Enterキーでも保存できる', async () => {
      const user = userEvent.setup();
      renderPage();
      const input = await screen.findByLabelText('GitHubリポジトリのURL');

      await user.type(input, 'https://github.com/asahi1999/number-guess{Enter}');

      await waitFor(async () =>
        expect((await getWeek())?.repoUrl).toBe('https://github.com/asahi1999/number-guess'),
      );
    });

    it('URLを空にして保存すると、登録を取り消せる', async () => {
      const user = userEvent.setup();
      await db.weeks.update('week-01', { repoUrl: 'https://github.com/asahi1999/number-guess' });
      renderPage();
      const input = await screen.findByLabelText('GitHubリポジトリのURL');

      await user.clear(input);
      await user.click(screen.getByRole('button', { name: '保存' }));

      await waitFor(async () => expect((await getWeek())?.repoUrl).toBe(''));
      expect(screen.queryByRole('link', { name: 'GitHubで開く' })).not.toBeInTheDocument();
    });

    it('開始日を手で変更できる', async () => {
      renderPage();
      const input = await screen.findByLabelText('開始日');

      fireEvent.change(input, { target: { value: '2026-11-17' } });

      await waitFor(async () => expect((await getWeek())?.startedAt).toBe('2026-11-17'));
      expect(input).toBeValid();
    });

    it('今日より先の開始日は保存せず、入力欄の下にエラーを表示する', async () => {
      renderPage();
      const input = await screen.findByLabelText('開始日');

      fireEvent.change(input, { target: { value: '2026-11-19' } });

      expect(input).toHaveAccessibleDescription('今日より先の日付は入力できません');
      expect((await getWeek())?.startedAt).toBeNull();
    });

    it('完了日を開始日より前にはできない', async () => {
      await db.weeks.update('week-01', {
        status: 'done',
        startedAt: '2026-11-17',
        completedAt: '2026-11-18',
      });
      renderPage();
      const input = await screen.findByLabelText('完了日');

      fireEvent.change(input, { target: { value: '2026-11-16' } });

      expect(input).toHaveAccessibleDescription('完了日は開始日以降の日付にしてください');
      expect((await getWeek())?.completedAt).toBe('2026-11-18');
    });

    it('完成していない週には完了日の入力欄を出さない', async () => {
      renderPage();
      await screen.findByLabelText('開始日');

      expect(screen.queryByLabelText('完了日')).not.toBeInTheDocument();
    });
  });

  describe('メモ', () => {
    it('入力が止まると自動で保存し、保存したことを表示する', async () => {
      const user = userEvent.setup();
      renderPage();
      const textarea = await findMemoInput();

      await user.type(textarea, 'Scanner の使い方を調べた');

      expect(screen.getByText('保存中…')).toBeInTheDocument();
      expect(await screen.findByText('保存しました', {}, { timeout: 3000 })).toBeInTheDocument();
      expect((await getWeek())?.memo).toBe('Scanner の使い方を調べた');
    });

    it('保存を待たずに画面を離れても、入力した内容を保存する', async () => {
      const user = userEvent.setup();
      const { unmount } = renderPage();
      await user.type(await findMemoInput(), '途中のメモ');

      unmount();

      await waitFor(async () => expect((await getWeek())?.memo).toBe('途中のメモ'));
    });

    it('プレビューに切り替えると、Markdown を整形して表示する', async () => {
      const user = userEvent.setup();
      await db.weeks.update('week-01', { memo: '## 学んだこと\n\n- 乱数は `Random`' });
      renderPage();
      await findMemoInput();

      await user.click(screen.getByRole('button', { name: 'プレビュー' }));

      expect(screen.getByRole('heading', { level: 2, name: '学んだこと' })).toBeInTheDocument();
      // 「Random」はチェック項目にもあるので、メモのカードの中に絞って探す
      const memoCard = screen.getByRole('region', { name: 'メモ' });
      expect(within(memoCard).getByText('Random').tagName).toBe('CODE');
      expect(screen.getByRole('button', { name: 'プレビュー' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.queryByRole('textbox', { name: 'メモ' })).not.toBeInTheDocument();
    });

    it('メモが空のままプレビューにすると、その旨を表示する', async () => {
      const user = userEvent.setup();
      renderPage();
      await findMemoInput();

      await user.click(screen.getByRole('button', { name: 'プレビュー' }));

      expect(screen.getByText('メモはまだありません。')).toBeInTheDocument();
    });

    it('プレビューから編集に戻すと、入力した内容が残っている', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.type(await findMemoInput(), '下書き');

      await user.click(screen.getByRole('button', { name: 'プレビュー' }));
      await user.click(screen.getByRole('button', { name: '編集' }));

      expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveValue('下書き');
    });
  });

  describe('学習ログ', () => {
    it('ログがなければ、合計0分と予定時間を表示する', async () => {
      renderPage();
      const card = await screen.findByRole('region', { name: '学習ログ' });

      expect(card).toHaveTextContent('0分 / 予定 9時間');
      expect(within(card).getByText('この週の学習ログはまだありません。')).toBeInTheDocument();
    });

    it('この週のログを新しい順に並べ、合計時間を予定時間と比べる', async () => {
      await db.logs.bulkAdd([
        buildLog({
          id: 'l1',
          weekId: 'week-01',
          date: '2026-11-16',
          minutes: 90,
          content: '変数とデータ型',
          source: 'timer',
        }),
        buildLog({
          id: 'l2',
          weekId: 'week-01',
          date: '2026-11-17',
          minutes: 45,
          content: 'if と for',
          source: 'manual',
        }),
        buildLog({ id: 'other', weekId: 'week-02', minutes: 600, content: 'ほかの週のログ' }),
      ]);
      renderPage();
      const card = await screen.findByRole('region', { name: '学習ログ' });

      const rows = within(card).getAllByRole('listitem');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('11月17日（火）');
      expect(rows[0]).toHaveTextContent('手動');
      expect(rows[0]).toHaveTextContent('45分');
      expect(rows[0]).toHaveTextContent('if と for');
      expect(rows[1]).toHaveTextContent('タイマー');
      // 90分 + 45分 = 2時間15分。予定の9時間（540分）に対して25%
      expect(card).toHaveTextContent('2時間15分 / 予定 9時間');
      expect(
        within(card).getByRole('progressbar', { name: '予定時間に対する学習時間' }),
      ).toHaveAttribute('aria-valuenow', '25');
    });
  });
});
