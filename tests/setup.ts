// IndexedDB はテスト環境（jsdom）にないので、メモリ上の実装に差し替える。
// db を読み込むより先に実行する必要があるため、必ず先頭に置く
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { db } from '@/db/database';
import { useTimerStore } from '@/stores/timerStore';
import { useToastStore } from '@/stores/toastStore';

import { installMatchMedia, resetMatchMedia } from './matchMedia';

installMatchMedia();

// 画面の更新を待つ時間の上限。標準の1秒だと、テストを並列で動かして負荷が高いときに
// データベースの読み込みが間に合わず、たまに失敗することがあるため長めにしている。
// 1件のテストの上限（vite.config.ts の testTimeout：30秒）より短くしておく
configure({ asyncUtilTimeout: 10_000 });

// jsdom は window.scrollTo を実装しておらず、呼ぶとコンソールにエラーが出るので空の関数にする
window.scrollTo = () => {};

// jsdom は <dialog> の showModal / close を実装していないので、開閉の状態だけを再現する
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// テスト同士が影響しないよう、毎回すべてのテーブルを空にする
beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

afterEach(() => {
  cleanup();
  // 日付や時間を固定したテストの設定を、次のテストに持ち越さない
  vi.useRealTimers();
  resetMatchMedia();
  // 学習タイマーはアプリ全体で1つなので、次のテストに計測中の状態を持ち越さない
  useTimerStore.getState().reset();
  useToastStore.getState().clear();
  document.title = '';
  localStorage.clear();
  // テーマのテストが <html> に付けた状態を次のテストに持ち越さない
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});
