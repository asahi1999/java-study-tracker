import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { Toaster } from '@/components/layout/Toaster';
import { db } from '@/db/database';
import { seedIfEmpty } from '@/db/seed';
import { logService } from '@/db/services/logService';
import { useToastStore } from '@/stores/toastStore';

import { buildLog } from '../../tests/factories';
import { useBadgeWatcher } from './useBadgeWatcher';

function Watcher() {
  useBadgeWatcher();
  return null;
}

function renderWatcher() {
  return render(
    <MemoryRouter>
      <Watcher />
      <Toaster />
    </MemoryRouter>,
  );
}

const toasts = () => useToastStore.getState().toasts;

describe('useBadgeWatcher', () => {
  beforeEach(async () => {
    await seedIfEmpty('2026-11-16');
  });

  it('条件を満たすものがなければ、何もしない', async () => {
    renderWatcher();

    // 判定が一度終わるのを待つ
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await db.badges.count()).toBe(0);
    expect(toasts()).toEqual([]);
  });

  it('学習ログを足すと「はじめの一歩」を獲得し、通知を出す', async () => {
    renderWatcher();

    await logService.add({
      date: '2026-11-16',
      minutes: 30,
      weekId: 'week-01',
      content: '',
      source: 'manual',
    });

    expect(await screen.findByText('バッジを獲得しました')).toBeInTheDocument();
    expect(screen.getByText('「はじめの一歩」初めて学習ログを記録')).toBeInTheDocument();
    expect(await db.badges.get('first-log')).toBeDefined();
  });

  it('開いた時点ですでに条件を満たしているバッジは、まとめて1つの通知にする', async () => {
    await db.logs.bulkAdd([
      buildLog({ id: 'a', date: '2026-11-16', minutes: 300 }),
      buildLog({ id: 'b', date: '2026-11-17', minutes: 200 }),
      buildLog({ id: 'c', date: '2026-11-18', minutes: 100 }),
    ]);
    await db.weeks.update('week-01', { status: 'done', completedAt: '2026-11-18' });
    renderWatcher();

    // はじめの一歩・初完成・三日坊主卒業・10時間突破
    expect(await screen.findByText('バッジを4個獲得しました')).toBeInTheDocument();
    expect(toasts()).toHaveLength(1);
    expect(await db.badges.count()).toBe(4);
  });

  it('同じバッジを二度知らせない', async () => {
    renderWatcher();
    await logService.add({
      date: '2026-11-16',
      minutes: 30,
      weekId: null,
      content: '',
      source: 'manual',
    });
    await screen.findByText('バッジを獲得しました');

    // 別のログを足しても、新しく満たした条件がなければ通知は増えない
    await logService.add({
      date: '2026-11-16',
      minutes: 10,
      weekId: null,
      content: '',
      source: 'manual',
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(toasts()).toHaveLength(1);
    expect(await db.badges.count()).toBe(1);
  });

  it('一度獲得したバッジは、条件を満たさなくなっても消さない', async () => {
    renderWatcher();
    const log = await logService.add({
      date: '2026-11-16',
      minutes: 30,
      weekId: null,
      content: '',
      source: 'manual',
    });
    await waitFor(async () => expect(await db.badges.get('first-log')).toBeDefined());

    await logService.remove(log.id);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(await db.badges.get('first-log')).toBeDefined();
  });
});
