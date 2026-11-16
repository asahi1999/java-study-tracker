import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';
import { TIMER_STORAGE_KEY, useTimerStore } from '@/stores/timerStore';

import { TimerWidget } from './TimerWidget';

const MINUTE = 60_000;

/** 時計を進める（Date だけを固定しているので、指定した分だけ先の時刻にする） */
function advance(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

/** 右下のボタンを押して、操作パネルを開く */
async function openPanel() {
  await userEvent.click(await screen.findByRole('button', { name: /学習タイマー/ }));
  return screen.getByRole('region', { name: '学習タイマー' });
}

const store = () => useTimerStore.getState();

describe('TimerWidget', () => {
  beforeEach(async () => {
    // 学習開始日（11/16・月）の2日後の 10:00。1週目の途中
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 10, 0, 0));
    await seedIfEmpty('2026-11-16');
  });

  describe('パネルの開閉', () => {
    it('はじめは閉じていて、ボタンを押すと開く', async () => {
      render(<TimerWidget />);
      const toggle = await screen.findByRole('button', { name: /学習タイマー/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('region', { name: '学習タイマー' })).not.toBeInTheDocument();

      await userEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('region', { name: '学習タイマー' })).toBeInTheDocument();
    });

    it('Esc キーで閉じて、フォーカスをボタンに戻す', async () => {
      render(<TimerWidget />);
      const panel = await openPanel();

      within(panel).getByRole('button', { name: '開始' }).focus();
      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('region', { name: '学習タイマー' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /学習タイマー/ })).toHaveFocus();
    });
  });

  describe('週の選択', () => {
    it('初期値は今週（現在の週）になる', async () => {
      render(<TimerWidget />);
      const panel = await openPanel();

      await waitFor(() =>
        expect(within(panel).getByRole('combobox', { name: '学習する週' })).toHaveValue('week-01'),
      );
    });

    it('選んだ週で計測を始める', async () => {
      render(<TimerWidget />);
      const panel = await openPanel();
      const select = within(panel).getByRole('combobox', { name: '学習する週' });
      await waitFor(() => expect(select).toHaveValue('week-01'));

      await userEvent.selectOptions(select, 'week-03');
      await userEvent.click(within(panel).getByRole('button', { name: '開始' }));

      expect(store()).toMatchObject({ status: 'running', weekId: 'week-03' });
    });

    it('「週の指定なし」でも始められる', async () => {
      render(<TimerWidget />);
      const panel = await openPanel();
      const select = within(panel).getByRole('combobox', { name: '学習する週' });
      await waitFor(() => expect(select).toHaveValue('week-01'));

      await userEvent.selectOptions(select, '');
      await userEvent.click(within(panel).getByRole('button', { name: '開始' }));

      expect(store()).toMatchObject({ status: 'running', weekId: null });
    });

    it('計測中に週を選び直せる', async () => {
      act(() => store().start('week-01'));
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.selectOptions(
        within(panel).getByRole('combobox', { name: '学習する週' }),
        'week-02',
      );

      expect(store().weekId).toBe('week-02');
    });
  });

  describe('計測', () => {
    it('開始すると「計測中」になり、経過時間を表示する', async () => {
      render(<TimerWidget />);
      const panel = await openPanel();
      await userEvent.click(within(panel).getByRole('button', { name: '開始' }));

      expect(panel).toHaveTextContent('計測中');
      expect(within(panel).getByRole('timer', { name: '経過時間' })).toHaveTextContent('00:00:00');

      // 表示は1秒ごとに更新される
      advance(65_000);
      await waitFor(() =>
        expect(within(panel).getByRole('timer', { name: '経過時間' })).toHaveTextContent(
          '00:01:05',
        ),
      );
    });

    it('計測中は、タブのタイトルに経過時間を出す', async () => {
      act(() => store().start('week-01'));
      advance(5 * MINUTE);
      render(<TimerWidget />);

      await waitFor(() => expect(document.title).toBe('00:05:00 計測中 | Java Study Tracker'));
    });

    it('一時停止すると時間が止まり、タブのタイトルを元に戻す', async () => {
      act(() => store().start('week-01'));
      advance(5 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '一時停止' }));
      advance(30 * MINUTE);

      expect(panel).toHaveTextContent('一時停止中');
      expect(within(panel).getByRole('timer', { name: '経過時間' })).toHaveTextContent('00:05:00');
      expect(document.title).toBe('Java Study Tracker');
    });

    it('再開すると、続きから数える', async () => {
      act(() => store().start('week-01'));
      advance(5 * MINUTE);
      act(() => store().pause());
      advance(30 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '再開' }));
      advance(2 * MINUTE);

      await waitFor(() =>
        expect(within(panel).getByRole('timer', { name: '経過時間' })).toHaveTextContent(
          '00:07:00',
        ),
      );
    });

    it('パネルを閉じていても、ボタンに経過時間を出す', async () => {
      act(() => store().start('week-01'));
      advance(12 * MINUTE);
      render(<TimerWidget />);

      expect(await screen.findByRole('button', { name: /学習タイマー/ })).toHaveTextContent(
        '00:12:00',
      );
    });
  });

  describe('終了して記録', () => {
    it('やったことを入力して保存すると、開始した日の学習ログになる', async () => {
      act(() => store().start('week-01'));
      advance(45 * MINUTE + 30_000);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      const dialog = screen.getByRole('dialog', { name: '学習を記録' });
      // 秒は切り捨てる
      expect(dialog).toHaveTextContent('学習時間45分');
      expect(dialog).toHaveTextContent('学習した日11月18日（水）');

      await userEvent.type(within(dialog).getByRole('textbox', { name: 'やったこと' }), '変数と型');
      await userEvent.click(within(dialog).getByRole('button', { name: 'ログを保存' }));

      await waitFor(async () => expect(await db.logs.count()).toBe(1));
      expect((await db.logs.toArray())[0]).toMatchObject({
        date: '2026-11-18',
        minutes: 45,
        weekId: 'week-01',
        content: '変数と型',
        source: 'timer',
      });
      // 保存したらタイマーは止まり、ダイアログは閉じる
      await waitFor(() => expect(store().status).toBe('idle'));
      expect(localStorage.getItem(TIMER_STORAGE_KEY)).toBeNull();
      expect(screen.queryByRole('textbox', { name: 'やったこと' })).not.toBeInTheDocument();
    });

    it('未着手の週で記録すると、その週が「進行中」になる', async () => {
      act(() => store().start('week-01'));
      advance(10 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      await userEvent.click(screen.getByRole('button', { name: 'ログを保存' }));

      await waitFor(async () =>
        expect(await db.weeks.get('week-01')).toMatchObject({
          status: 'in_progress',
          startedAt: '2026-11-18',
        }),
      );
    });

    it('日付をまたいで計測しても、開始した日の日付で記録する', async () => {
      vi.setSystemTime(new Date(2026, 10, 18, 23, 30, 0));
      act(() => store().start('week-01'));
      // 翌日の 0:30 まで計測する
      advance(60 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      expect(screen.getByRole('dialog', { name: '学習を記録' })).toHaveTextContent(
        '学習した日11月18日（水）',
      );
      await userEvent.click(screen.getByRole('button', { name: 'ログを保存' }));

      await waitFor(async () => expect(await db.logs.count()).toBe(1));
      expect((await db.logs.toArray())[0]).toMatchObject({ date: '2026-11-18', minutes: 60 });
    });

    it('ダイアログで週を変えて保存できる', async () => {
      act(() => store().start('week-01'));
      advance(10 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      const dialog = screen.getByRole('dialog', { name: '学習を記録' });
      await userEvent.selectOptions(
        within(dialog).getByRole('combobox', { name: '週' }),
        'week-02',
      );
      await userEvent.click(within(dialog).getByRole('button', { name: 'ログを保存' }));

      await waitFor(async () => expect(await db.logs.count()).toBe(1));
      expect((await db.logs.toArray())[0]?.weekId).toBe('week-02');
    });

    it('キャンセルすると保存せず、一時停止のまま残る', async () => {
      act(() => store().start('week-01'));
      advance(10 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(await db.logs.count()).toBe(0);
      expect(store()).toMatchObject({ status: 'paused', accumulatedMs: 10 * MINUTE });
    });

    it('1分未満なら保存できないと伝え、計測を続けられる', async () => {
      act(() => store().start('week-01'));
      advance(59_000);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      const dialog = screen.getByRole('dialog', { name: '学習を記録' });
      expect(dialog).toHaveTextContent('1分に満たないので、学習ログには保存できません。');
      expect(within(dialog).queryByRole('button', { name: 'ログを保存' })).not.toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('button', { name: '計測を続ける' }));

      expect(store().status).toBe('running');
      expect(await db.logs.count()).toBe(0);
    });

    it('1分未満のとき、計測を破棄できる', async () => {
      act(() => store().start('week-01'));
      advance(30_000);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      await userEvent.click(screen.getByRole('button', { name: '計測を破棄' }));

      expect(store().status).toBe('idle');
      expect(await db.logs.count()).toBe(0);
    });

    it('24時間を超えたら注意を出し、1440分として保存する', async () => {
      act(() => store().start('week-01'));
      advance(30 * 60 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      const dialog = screen.getByRole('dialog', { name: '学習を記録' });
      expect(dialog).toHaveTextContent('計測が24時間を超えました。');
      expect(dialog).toHaveTextContent('24時間（1440分）として保存します。');

      await userEvent.click(within(dialog).getByRole('button', { name: 'ログを保存' }));

      await waitFor(async () => expect(await db.logs.count()).toBe(1));
      expect((await db.logs.toArray())[0]?.minutes).toBe(1440);
    });

    it('計測中に週が削除されていたら、「週の指定なし」で保存する', async () => {
      act(() => store().start('deleted-week'));
      advance(10 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '終了して記録' }));
      await userEvent.click(screen.getByRole('button', { name: 'ログを保存' }));

      await waitFor(async () => expect(await db.logs.count()).toBe(1));
      expect((await db.logs.toArray())[0]?.weekId).toBeNull();
    });
  });

  describe('破棄', () => {
    it('確認してから破棄し、学習ログには残さない', async () => {
      act(() => store().start('week-01'));
      advance(10 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '記録せずに破棄' }));
      const dialog = screen.getByRole('dialog', { name: '計測を破棄しますか？' });
      // 確認の段階では、まだ破棄しない
      expect(store().status).toBe('running');

      await userEvent.click(within(dialog).getByRole('button', { name: '破棄する' }));

      expect(store().status).toBe('idle');
      expect(await db.logs.count()).toBe(0);
    });

    it('確認でキャンセルすると、計測を続ける', async () => {
      act(() => store().start('week-01'));
      advance(10 * MINUTE);
      render(<TimerWidget />);
      const panel = await openPanel();

      await userEvent.click(within(panel).getByRole('button', { name: '記録せずに破棄' }));
      await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(store().status).toBe('running');
    });
  });
});
