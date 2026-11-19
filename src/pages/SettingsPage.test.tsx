import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/database';
import { createInitialSettings, seedIfEmpty } from '@/db/seed';
import { dataService } from '@/db/services/dataService';
import { stringifyBackup } from '@/lib/backup';
import { useTimerStore } from '@/stores/timerStore';
import { useToastStore } from '@/stores/toastStore';

import { buildLog } from '../../tests/factories';
import { setToday } from '../../tests/time';
import { SettingsPage } from './SettingsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

async function findCard(name: string) {
  return screen.findByRole('region', { name });
}

beforeEach(async () => {
  await seedIfEmpty('2026-11-16');
});

describe('SettingsPage：学習の予定と目標', () => {
  it('保存した値を表示し、「保存」を押すと保存する', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findCard('学習の予定と目標');
    expect(await within(card).findByLabelText('学習開始日')).toHaveValue('2026-11-16');
    const weekly = within(card).getByLabelText('週の目標（時間）');
    expect(weekly).toHaveValue('9');

    await user.clear(weekly);
    await user.type(weekly, '10.5');
    await user.click(within(card).getByRole('button', { name: '保存' }));

    await waitFor(async () =>
      expect(await db.settings.get('app')).toMatchObject({ weeklyGoalHours: 10.5 }),
    );
    expect(within(card).getByRole('status')).toHaveTextContent('保存しました');
  });

  it('誤りがあればエラーを出して保存しない', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findCard('学習の予定と目標');
    const daily = await within(card).findByLabelText('1日の目標（分）');
    await user.clear(daily);
    await user.type(daily, '0');
    await user.click(within(card).getByRole('button', { name: '保存' }));

    expect(within(card).getByText('1日の目標は1〜1440分で入力してください')).toBeInTheDocument();
    expect(await db.settings.get('app')).toMatchObject({ dailyGoalMinutes: 60 });
  });

  it('開始日の入力中は保存せず、「保存」を押したときに保存する', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findCard('学習の予定と目標');
    const startDate = await within(card).findByLabelText('学習開始日');
    await user.clear(startDate);
    await user.type(startDate, '2026-12-07');
    expect(await db.settings.get('app')).toMatchObject({ startDate: '2026-11-16' });

    await user.click(within(card).getByRole('button', { name: '保存' }));
    await waitFor(async () =>
      expect(await db.settings.get('app')).toMatchObject({ startDate: '2026-12-07' }),
    );
  });
});

describe('SettingsPage：休止期間', () => {
  it('休止期間を追加すると、日数つきで一覧に出る', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findCard('休止期間');
    expect(await within(card).findByText('休止期間はまだ登録されていません。')).toBeInTheDocument();
    await user.type(within(card).getByLabelText('名前'), '年末年始');
    await user.type(within(card).getByLabelText('開始日'), '2026-12-29');
    await user.type(within(card).getByLabelText('終了日'), '2027-01-03');
    await user.click(within(card).getByRole('button', { name: '休止期間を追加' }));

    expect(
      await within(card).findByText('2026年12月29日（火）〜2027年1月3日（日）・6日間'),
    ).toBeInTheDocument();
    expect((await db.settings.get('app'))?.breakPeriods).toEqual([
      { id: expect.any(String), label: '年末年始', start: '2026-12-29', end: '2027-01-03' },
    ]);
    expect(within(card).getByLabelText('名前')).toHaveValue('');
  });

  it('終了日が開始日より前なら追加しない', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findCard('休止期間');
    await user.type(await within(card).findByLabelText('名前'), '年末年始');
    await user.type(within(card).getByLabelText('開始日'), '2027-01-03');
    await user.type(within(card).getByLabelText('終了日'), '2026-12-29');
    await user.click(within(card).getByRole('button', { name: '休止期間を追加' }));

    expect(
      within(card).getByText('終了日は開始日と同じか後ろの日付にしてください'),
    ).toBeInTheDocument();
    expect((await db.settings.get('app'))?.breakPeriods).toEqual([]);
  });

  it('確認してから休止期間を削除する', async () => {
    const user = userEvent.setup();
    await db.settings.update('app', {
      breakPeriods: [{ id: 'b1', label: '年末年始', start: '2026-12-29', end: '2027-01-03' }],
    });
    renderPage();

    const card = await findCard('休止期間');
    await user.click(await within(card).findByRole('button', { name: '年末年始を削除' }));
    const dialog = screen.getByRole('dialog', { name: '休止期間を削除しますか？' });
    await user.click(within(dialog).getByRole('button', { name: '削除する' }));

    await waitFor(async () => expect((await db.settings.get('app'))?.breakPeriods).toEqual([]));
  });
});

describe('SettingsPage：エクスポート', () => {
  const createObjectURL = vi.fn(() => 'blob:export');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    // jsdom にはファイルの保存がないので、URL の作成とリンクのクリックを置き換える
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('全データをJSONにして表示し、コピーとダウンロードができる', async () => {
    const user = userEvent.setup();
    await db.logs.add(buildLog({ id: 'log-1', weekId: 'week-01' }));
    renderPage();

    const card = await findCard('データのエクスポート');
    await user.click(within(card).getByRole('button', { name: 'JSONを作る' }));

    const textarea = await within(card).findByRole('textbox', { name: /エクスポートしたJSON/ });
    const json = JSON.parse((textarea as HTMLTextAreaElement).value) as Record<string, unknown>;
    expect(json).toMatchObject({ app: 'java-study-tracker', schemaVersion: 1 });

    await user.click(within(card).getByRole('button', { name: 'コピー' }));
    expect(within(card).getByRole('status')).toHaveTextContent('コピーしました');
    expect(await navigator.clipboard.readText()).toBe((textarea as HTMLTextAreaElement).value);

    await user.click(within(card).getByRole('button', { name: 'ダウンロード' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(within(card).getByRole('status')).toHaveTextContent(
      /java-study-tracker-\d{4}-\d{2}-\d{2}\.json の保存を始めました/,
    );
  });
});

describe('SettingsPage：インポート', () => {
  /** エクスポートしたJSONを、少し書き換えたファイルにする */
  async function createBackupFile(): Promise<File> {
    const backup = await dataService.exportAll(new Date('2026-11-19T01:30:00.000Z'));
    backup.data.settings = { ...createInitialSettings('2026-10-01'), theme: 'dark' };
    backup.data.logs = [buildLog({ id: 'imported', weekId: 'week-01', minutes: 90 })];
    return new File([stringifyBackup(backup)], 'backup.json', { type: 'application/json' });
  }

  it('ファイルの内容を見せてから、確認後に全データを置き換える', async () => {
    const user = userEvent.setup();
    const file = await createBackupFile();
    await db.logs.add(buildLog({ id: 'current' }));
    renderPage();

    const card = await findCard('データのインポート');
    await user.upload(within(card).getByLabelText('JSONファイルを選ぶ'), file);

    const dialog = await screen.findByRole('dialog', { name: 'この内容でインポートしますか？' });
    expect(dialog).toHaveTextContent('backup.json');
    expect(dialog).toHaveTextContent('学習開始日2026年10月1日（木）');
    expect(dialog).toHaveTextContent('学習ログ1件（合計1時間30分）');
    expect(dialog).toHaveTextContent('月3件・ステップ8件・週10件・チェック項目40件');
    // 確認するまでは何も変えない
    expect((await db.logs.toArray()).map((log) => log.id)).toEqual(['current']);

    await user.click(within(dialog).getByRole('button', { name: 'すべて置き換える' }));

    await waitFor(async () =>
      expect((await db.logs.toArray()).map((log) => log.id)).toEqual(['imported']),
    );
    expect(await db.settings.get('app')).toMatchObject({ startDate: '2026-10-01', theme: 'dark' });
    expect(useToastStore.getState().toasts.map((toast) => toast.title)).toEqual([
      'データをインポートしました',
    ]);
  });

  it('キャンセルすると何も変えない', async () => {
    const user = userEvent.setup();
    const file = await createBackupFile();
    renderPage();

    const card = await findCard('データのインポート');
    await user.upload(within(card).getByLabelText('JSONファイルを選ぶ'), file);
    const dialog = await screen.findByRole('dialog', { name: 'この内容でインポートしますか？' });
    await user.click(within(dialog).getByRole('button', { name: 'キャンセル' }));

    expect(await db.settings.get('app')).toMatchObject({ startDate: '2026-11-16' });
  });

  it('形式が正しくなければ、誤りの内容を表示して何も変えない', async () => {
    const user = userEvent.setup();
    const backup = await dataService.exportAll();
    const broken = JSON.parse(stringifyBackup(backup)) as {
      data: { weeks: Record<string, unknown>[]; logs: Record<string, unknown>[] };
    };
    broken.data.weeks[0]!.status = 'finished';
    broken.data.logs = [{ ...buildLog(), minutes: 0 }];
    const file = new File([JSON.stringify(broken)], 'broken.json', { type: 'application/json' });
    renderPage();

    const card = await findCard('データのインポート');
    await user.upload(within(card).getByLabelText('JSONファイルを選ぶ'), file);

    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('読み込めませんでした。データは変更していません。');
    expect(alert).toHaveTextContent(
      'data.weeks[0].status："not_started"・"in_progress"・"done" のどれかにしてください',
    );
    expect(alert).toHaveTextContent('data.logs[0].minutes：1〜1440にしてください');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await db.logs.count()).toBe(0);
  });

  it('JSONでないファイルは、その理由を表示する', async () => {
    const user = userEvent.setup();
    const file = new File(['not json'], 'memo.json', { type: 'application/json' });
    renderPage();

    const card = await findCard('データのインポート');
    await user.upload(within(card).getByLabelText('JSONファイルを選ぶ'), file);

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'JSONとして読み込めませんでした',
    );
  });
});

describe('SettingsPage：全データのリセット', () => {
  it('2段階の確認のあと、すべてを消して初めの状態に戻す', async () => {
    const user = userEvent.setup();
    setToday('2026-11-19');
    await db.logs.add(buildLog());
    await db.settings.update('app', { theme: 'dark', weeklyGoalHours: 12 });
    useTimerStore.getState().start('week-01');
    renderPage();

    const card = await findCard('全データのリセット');
    await user.click(within(card).getByRole('button', { name: 'すべてのデータをリセット' }));
    const first = screen.getByRole('dialog', { name: 'すべてのデータをリセットしますか？' });
    expect(first).toHaveTextContent('獲得したバッジ');
    await user.click(within(first).getByRole('button', { name: 'リセットに進む' }));

    const second = screen.getByRole('dialog', { name: '最後の確認' });
    expect(within(second).getByLabelText('確認の言葉')).toHaveFocus();
    const confirm = within(second).getByRole('button', { name: 'すべて消す' });
    expect(confirm).toBeDisabled();
    await user.type(within(second).getByLabelText('確認の言葉'), 'リセット');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(async () => expect(await db.logs.count()).toBe(0));
    expect(await db.settings.get('app')).toEqual(createInitialSettings('2026-11-19'));
    expect(useTimerStore.getState().status).toBe('idle');
  });

  it('1段階目でキャンセルすると何も消さない', async () => {
    const user = userEvent.setup();
    await db.logs.add(buildLog());
    renderPage();

    const card = await findCard('全データのリセット');
    await user.click(within(card).getByRole('button', { name: 'すべてのデータをリセット' }));
    const first = screen.getByRole('dialog', { name: 'すべてのデータをリセットしますか？' });
    await user.click(within(first).getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await db.logs.count()).toBe(1);
  });
});

describe('SettingsPage：バージョン', () => {
  it('アプリのバージョンを表示する', async () => {
    renderPage();
    expect(
      await screen.findByText(/^Java Study Tracker バージョン \d+\.\d+\.\d+$/),
    ).toBeInTheDocument();
  });
});
