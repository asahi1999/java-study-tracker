// IndexedDB はテスト環境（jsdom）にないので、メモリ上の実装に差し替える。
// db を読み込むより先に実行する必要があるため、必ず先頭に置く
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { db } from '@/db/database';

import { installMatchMedia, resetMatchMedia } from './matchMedia';

installMatchMedia();

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
  resetMatchMedia();
  localStorage.clear();
  // テーマのテストが <html> に付けた状態を次のテストに持ち越さない
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});
