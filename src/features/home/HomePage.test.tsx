import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { v2db } from '@/db/v2/database';
import { emptyProgress } from '@/db/v2/progress';
import { createFakeRunner } from '@/runtime/java/fakeRunner';

import { renderApp } from '../../../tests/renderApp';

async function clear(
  id: string,
  type: 'card' | 'predict' | 'fill' | 'fix' | 'draw' | 'quiz',
  at: string,
) {
  await v2db.progress.put({
    ...emptyProgress({ id, chapter: 0, type }),
    status: 'cleared',
    clearedAt: at,
    lastOpenedAt: at,
  });
}

describe('ホーム（F-HOME-1・2）', () => {
  it('初回は、コースの最初のステップを場所・目安時間・冒頭つきで出し、「つづける」にフォーカスを置く', async () => {
    const { user } = await renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: '見本の説明カード' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/部品 0-1「見本の部品1」/)).toHaveTextContent('ステップ 1 / 4');
    expect(screen.getByText('約1分')).toBeInTheDocument();
    expect(screen.getByText('は1行を出す。', { exact: false })).toBeInTheDocument();
    const go = screen.getByRole('link', { name: /つづける/ });
    expect(go).toHaveFocus();
    expect(screen.getByText('このステップだけで終えてOK。')).toBeInTheDocument();
    expect(screen.getByText('いまここ')).toBeInTheDocument();

    await user.click(go);
    expect(
      await screen.findByRole('heading', { level: 1, name: '見本の説明カード' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'わかった' })).toBeInTheDocument();
  });

  it('クリアしたら、次のステップに進む。済んだものは「済」と読める', async () => {
    await clear('ch00.sample-card', 'card', '2026-12-01T09:00:00.000Z');
    await renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: '見本の予想' }),
    ).toBeInTheDocument();
    expect(screen.getByText('済')).toBeInTheDocument();
  });

  it('書きかけがあれば「前回の続き」のコードと保存の時刻を出す', async () => {
    await clear('ch00.sample-card', 'card', '2026-12-01T09:00:00.000Z');
    await v2db.progress.put({
      ...emptyProgress({ id: 'ch00.sample-fill', chapter: 0, type: 'fill' }),
      status: 'trying',
      lastOpenedAt: '2026-12-01T09:30:00.000Z',
    });
    await v2db.drafts.put({
      stepId: 'ch00.sample-fill',
      rev: 2,
      files: { 'Main.java': 'void main() {\n    System.out.println("書きかけ");\n}\n' },
      cursorLine: 2,
      updatedAt: '2026-12-01T09:30:00.000Z',
    });
    await renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: '見本の穴埋め' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('前回の続き')).toBeInTheDocument();
    expect(screen.getByLabelText('前回の続きのコード')).toHaveTextContent(
      'System.out.println("書きかけ");',
    );
    expect(screen.getByText(/^自動保存 /)).toBeInTheDocument();
  });

  it('絵の問題は「できあがるとこうなる」に完成図と目標の1行を出す', async () => {
    for (const [id, type] of [
      ['ch00.sample-card', 'card'],
      ['ch00.sample-predict', 'predict'],
      ['ch00.sample-choice', 'predict'],
      ['ch00.sample-fill', 'fill'],
      ['ch00.sample-fix', 'fix'],
    ] as const) {
      await clear(id, type, '2026-12-01T09:00:00.000Z');
    }
    await renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: '見本の絵' })).toBeInTheDocument();
    expect(screen.getByText('できあがるとこうなる')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /できあがりの絵。小さな部屋/ })).toBeInTheDocument();
  });

  it('全部クリアしたら「次の章は準備中です」（F-HOME-6）', async () => {
    const { content } = await renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    for (const s of content.course.chapters.flatMap((c) => c.steps)) {
      await clear(s.id, s.type as 'card', '2026-12-01T09:00:00.000Z');
    }
    expect(
      await screen.findByRole('heading', { level: 1, name: '次の章は準備中です' }),
    ).toBeInTheDocument();
  });

  it('Java の実行環境の状態を出す（F-HOME-4）', async () => {
    const runner = createFakeRunner({ status: 'downloading' });
    await renderApp('/', runner);
    expect(await screen.findByText('Java: 準備中 0%')).toBeInTheDocument();
    runner.setStatus('downloading', 0.37);
    expect(await screen.findByText('Java: 準備中 37%')).toBeInTheDocument();
    runner.setStatus('unsupported');
    expect(await screen.findByText('Java: このブラウザでは動きません')).toBeInTheDocument();
  });
});
