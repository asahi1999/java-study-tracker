import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';

import { buildLog } from '../../tests/factories';
import { EditorPage } from './EditorPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <EditorPage />
    </MemoryRouter>,
  );
}

/** カード（見出しのついた region）を探す */
async function findCard(name: string) {
  return screen.findByRole('region', { name });
}

/** 週の一覧の行を、表示している名前から探す */
async function findWeekRow(label: string) {
  const name = await screen.findByText(label);
  const row = name.closest('li');
  if (!row) throw new Error(`${label} の行が見つかりません`);
  return row;
}

async function weekIdsInOrder(): Promise<string[]> {
  return (await db.weeks.orderBy('order').toArray()).map((week) => week.id);
}

beforeEach(async () => {
  await seedIfEmpty('2026-11-16');
});

describe('EditorPage：週', () => {
  it('週を表示順に並べ、月・ステップ・予定時間・状態を出す', async () => {
    renderPage();

    const row = await findWeekRow('1週目 数当てゲーム');
    expect(row).toHaveTextContent('1ヶ月目 ・ ① Javaの基礎 ・ 予定9時間 ・ 未着手');
    const card = await findCard('週とチェック項目');
    expect(within(card).getAllByRole('listitem')).toHaveLength(10);
  });

  it('週を追加すると、最後の週の次の週番号で末尾に入る', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await findCard('週とチェック項目')).getByRole('button', { name: '週を追加' }),
    );
    const dialog = screen.getByRole('dialog', { name: '週を追加' });
    expect(within(dialog).getByLabelText('開始の週')).toHaveValue('13');
    expect(within(dialog).getByLabelText('終了の週')).toHaveValue('13');
    expect(within(dialog).getByRole('combobox', { name: '月' })).toHaveValue('month-3');
    await user.type(within(dialog).getByLabelText('作るもの'), '電卓アプリ');
    await user.click(within(dialog).getByRole('button', { name: '週を追加' }));

    expect(await findWeekRow('13週目 電卓アプリ')).toBeInTheDocument();
    const added = (await db.weeks.orderBy('order').toArray()).at(-1);
    expect(added).toMatchObject({
      title: '電卓アプリ',
      weekStart: 13,
      weekEnd: 13,
      plannedHours: 9,
      status: 'not_started',
    });
  });

  it('入力に誤りがあれば、欄の下にエラーを出して保存しない', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await findCard('週とチェック項目')).getByRole('button', { name: '週を追加' }),
    );
    const dialog = screen.getByRole('dialog', { name: '週を追加' });
    await user.click(within(dialog).getByRole('button', { name: '週を追加' }));

    expect(within(dialog).getByText('作るものを入力してください')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('作るもの')).toHaveAttribute('aria-invalid', 'true');
    expect(await db.weeks.count()).toBe(10);
  });

  it('週を編集できる。終了の週が開始より前ならエラーにする', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await findWeekRow('1週目 数当てゲーム')).getByRole('button', {
        name: '1週目 数当てゲームを編集',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: '週を編集' });
    expect(within(dialog).getByLabelText('作るもの')).toHaveValue('数当てゲーム');

    await user.clear(within(dialog).getByLabelText('開始の週'));
    await user.type(within(dialog).getByLabelText('開始の週'), '2');
    await user.clear(within(dialog).getByLabelText('終了の週'));
    await user.type(within(dialog).getByLabelText('終了の週'), '1');
    await user.click(within(dialog).getByRole('button', { name: '変更を保存' }));
    expect(
      within(dialog).getByText('終了の週は、開始の週と同じか後ろの週にしてください'),
    ).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('終了の週'));
    await user.type(within(dialog).getByLabelText('終了の週'), '3');
    await user.click(within(dialog).getByRole('button', { name: '変更を保存' }));

    await waitFor(async () =>
      expect(await db.weeks.get('week-01')).toMatchObject({ weekStart: 2, weekEnd: 3 }),
    );
    expect(await findWeekRow('2〜3週目 数当てゲーム')).toBeInTheDocument();
  });

  it('上下のボタンで表示順を変え、動かした後もボタンにフォーカスを残す', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await findWeekRow('1週目 数当てゲーム');
    expect(within(row).getByRole('button', { name: '1週目 数当てゲームを上へ' })).toBeDisabled();
    await user.click(within(row).getByRole('button', { name: '1週目 数当てゲームを下へ' }));

    await waitFor(async () =>
      expect((await weekIdsInOrder()).slice(0, 2)).toEqual(['week-02', 'week-01']),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '1週目 数当てゲームを下へ' })).toHaveFocus(),
    );
    // 予定日のもとになる週番号は変えない
    expect(await db.weeks.get('week-01')).toMatchObject({ weekStart: 1, weekEnd: 1 });
  });

  it('週を削除すると、チェック項目は消え、学習ログは「週の指定なし」で残る', async () => {
    const user = userEvent.setup();
    await db.logs.add(buildLog({ id: 'log-1', weekId: 'week-01' }));
    renderPage();

    await user.click(
      within(await findWeekRow('1週目 数当てゲーム')).getByRole('button', {
        name: '1週目 数当てゲームを削除',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: '週を削除しますか？' });
    expect(dialog).toHaveTextContent('チェック項目（6件）');
    await waitFor(() => expect(dialog).toHaveTextContent('学習ログ（1件）'));
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    await waitFor(() => expect(screen.queryByText('1週目 数当てゲーム')).not.toBeInTheDocument());
    expect(await db.weeks.get('week-01')).toBeUndefined();
    expect(await db.skills.where('weekId').equals('week-01').count()).toBe(0);
    expect(await db.logs.get('log-1')).toMatchObject({ weekId: null });
  });
});

describe('EditorPage：チェック項目', () => {
  async function openSkills(user: ReturnType<typeof userEvent.setup>) {
    const row = await findWeekRow('2週目 じゃんけんゲーム（勝敗を記録）');
    await user.click(within(row).getByRole('button', { name: 'チェック項目（3件）' }));
    return row;
  }

  it('開くと項目の一覧が出て、名前を変えて Enter で保存できる', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await openSkills(user);

    const input = within(row).getByRole('textbox', { name: '1番目の項目' });
    expect(input).toHaveValue('メソッド分割');
    await user.clear(input);
    await user.type(input, 'メソッド{Enter}');

    await waitFor(async () =>
      expect(await db.skills.get('week-02-skill-1')).toMatchObject({ label: 'メソッド' }),
    );
  });

  it('空の名前は保存せず、エラーを出す', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await openSkills(user);

    const input = within(row).getByRole('textbox', { name: '1番目の項目' });
    await user.clear(input);
    await user.tab();

    expect(within(row).getByText('項目を入力してください')).toBeInTheDocument();
    expect(await db.skills.get('week-02-skill-1')).toMatchObject({ label: 'メソッド分割' });
  });

  it('項目を追加・並び替え・削除できる', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await openSkills(user);

    await user.type(within(row).getByRole('textbox', { name: '追加する項目' }), '二次元配列');
    await user.click(within(row).getByRole('button', { name: '追加' }));
    await waitFor(() =>
      expect(within(row).getByRole('textbox', { name: '4番目の項目' })).toHaveValue('二次元配列'),
    );
    // 続けて入力できるよう、追加の欄は空になる
    expect(within(row).getByRole('textbox', { name: '追加する項目' })).toHaveValue('');

    await user.click(within(row).getByRole('button', { name: '「二次元配列」を上へ' }));
    await waitFor(() =>
      expect(within(row).getByRole('textbox', { name: '3番目の項目' })).toHaveValue('二次元配列'),
    );

    await user.click(within(row).getByRole('button', { name: '「二次元配列」を削除' }));
    const dialog = screen.getByRole('dialog', { name: 'チェック項目を削除しますか？' });
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));
    await waitFor(async () =>
      expect(await db.skills.where('weekId').equals('week-02').count()).toBe(3),
    );
  });

  it('完成した週には、チェックを付けるには完成の取り消しが要ることを出す', async () => {
    const user = userEvent.setup();
    await db.weeks.update('week-02', { status: 'done', completedAt: '2026-11-20' });
    renderPage();
    const row = await openSkills(user);

    expect(row).toHaveTextContent('週の詳細で完成を取り消してください');
  });
});

describe('EditorPage：月とステップ', () => {
  it('週が残っている月は削除できず、その理由を伝える', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(within(await findCard('月')).getByRole('button', { name: '1ヶ月目を削除' }));

    const dialog = screen.getByRole('dialog', { name: 'この月は削除できません' });
    expect(dialog).toHaveTextContent('「1ヶ月目」には週が4件あります');
    await user.click(within(dialog).getByRole('button', { name: 'わかりました' }));
    expect(await db.months.get('month-1')).toBeDefined();
  });

  it('週のない月は削除でき、獲得できなくなるバッジを知らせる', async () => {
    const user = userEvent.setup();
    await db.weeks.where('monthId').equals('month-1').delete();
    renderPage();

    await user.click(within(await findCard('月')).getByRole('button', { name: '1ヶ月目を削除' }));
    const dialog = screen.getByRole('dialog', { name: '月を削除しますか？' });
    expect(dialog).toHaveTextContent('バッジ「1ヶ月目クリア」は獲得できなくなります');
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    await waitFor(async () => expect(await db.months.get('month-1')).toBeUndefined());
  });

  it('ステップを追加すると、次の番号が付く', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findCard('ステップ');
    await user.click(within(card).getByRole('button', { name: 'ステップを追加' }));
    const dialog = screen.getByRole('dialog', { name: 'ステップを追加' });
    await user.type(within(dialog).getByLabelText('名前'), 'Docker');
    await user.type(within(dialog).getByLabelText('学ぶ内容（任意）'), 'コンテナで動かす');
    await user.click(within(dialog).getByRole('button', { name: 'ステップを追加' }));

    expect(await within(card).findByText('⑨ Docker')).toBeInTheDocument();
    expect(card).toHaveTextContent('学ぶ内容：コンテナで動かす');
  });

  it('ステップの名前・学ぶ内容・アドバイスを編集できる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await findCard('ステップ')).getByRole('button', { name: '⑦ Git・コマンドを編集' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'ステップを編集' });
    const advice = within(dialog).getByLabelText('アドバイス（任意）');
    expect(advice).toHaveValue('1週目から使い、11週目で応用を学ぶ');
    await user.clear(advice);
    await user.type(advice, '毎日コミットする');
    await user.click(within(dialog).getByRole('button', { name: '変更を保存' }));

    await waitFor(async () =>
      expect(await db.steps.get('step-7')).toMatchObject({ advice: '毎日コミットする' }),
    );
  });

  it('週のないステップは削除でき、ほかのステップの番号は変わらない', async () => {
    const user = userEvent.setup();
    await db.weeks.where('stepId').equals('step-4').delete();
    renderPage();

    const card = await findCard('ステップ');
    await user.click(within(card).getByRole('button', { name: '④ オブジェクト指向を削除' }));
    const dialog = screen.getByRole('dialog', { name: 'ステップを削除しますか？' });
    expect(dialog).toHaveTextContent('バッジ「オブジェクト指向入門」は獲得できなくなります');
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    await waitFor(() =>
      expect(within(card).queryByText('④ オブジェクト指向')).not.toBeInTheDocument(),
    );
    expect(within(card).getByText('⑤ データベース（SQL）')).toBeInTheDocument();
  });

  it('月の名前とマイルストーンを編集できる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(within(await findCard('月')).getByRole('button', { name: '3ヶ月目を編集' }));
    const dialog = screen.getByRole('dialog', { name: '月を編集' });
    const milestone = within(dialog).getByLabelText('マイルストーン（任意）');
    await user.clear(milestone);
    await user.type(milestone, '単語帳を公開する');
    await user.click(within(dialog).getByRole('button', { name: '変更を保存' }));

    await waitFor(async () =>
      expect(await db.months.get('month-3')).toMatchObject({ milestone: '単語帳を公開する' }),
    );
  });
});

describe('EditorPage：初期ロードマップに戻す', () => {
  it('初めは「残す」が選ばれ、そのまま実行すると学習ログは残る', async () => {
    const user = userEvent.setup();
    await db.logs.add(buildLog({ id: 'log-1', weekId: 'week-01' }));
    await db.weeks.update('week-01', { title: '名前を変えた' });
    renderPage();

    const card = await findCard('初期ロードマップに戻す');
    await user.click(within(card).getByRole('button', { name: '初期ロードマップに戻す' }));
    const dialog = screen.getByRole('dialog', { name: '初期ロードマップに戻しますか？' });
    expect(within(dialog).getByRole('radio', { name: /進捗と学習ログを残す/ })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: '初期ロードマップに戻す' }));

    await waitFor(async () =>
      expect(await db.weeks.get('week-01')).toMatchObject({ title: '数当てゲーム' }),
    );
    expect(await db.logs.count()).toBe(1);
  });

  it('「すべて消して最初からにする」を選ぶと、学習ログとバッジも消す', async () => {
    const user = userEvent.setup();
    await db.logs.add(buildLog({ id: 'log-1', weekId: 'week-01' }));
    await db.badges.add({ id: 'first-log', earnedAt: '2026-11-16T10:00:00.000Z' });
    renderPage();

    const card = await findCard('初期ロードマップに戻す');
    await user.click(within(card).getByRole('button', { name: '初期ロードマップに戻す' }));
    const dialog = screen.getByRole('dialog', { name: '初期ロードマップに戻しますか？' });
    await user.click(within(dialog).getByRole('radio', { name: /すべて消して最初からにする/ }));
    await user.click(within(dialog).getByRole('button', { name: '初期ロードマップに戻す' }));

    await waitFor(async () => expect(await db.logs.count()).toBe(0));
    expect(await db.badges.count()).toBe(0);
  });
});
