import { EditorView } from '@codemirror/view';
import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { v2db } from '@/db/v2/database';
import { createFakeRunner, passedResult } from '@/runtime/java/fakeRunner';
import type { RunJob, RunResult } from '@/runtime/java/JavaRunner';
import { createUnsupportedRunner } from '@/runtime/java/support';

import { renderApp } from '../../../tests/renderApp';

/** 画面のエディタ（CodeMirror）の中身を書き換える */
function typeInEditor(code: string, index = 0) {
  const el = document.querySelectorAll<HTMLElement>('.cm-editor')[index];
  const view = EditorView.findFromDOM(el);
  if (!view) throw new Error('エディタが無い');
  act(() => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
  });
}

function editorText(index = 0): string {
  const el = document.querySelectorAll<HTMLElement>('.cm-editor')[index];
  return EditorView.findFromDOM(el)?.state.doc.toString() ?? '';
}

function failedResult(job: RunJob, actual: string): RunResult {
  const base = passedResult(job, actual);
  if (base.kind !== 'judged') throw new Error();
  const cases = base.stages[0].cases.map((c) => ({ ...c, ok: false, expected: c.actual, actual }));
  return { ...base, passed: 0, stages: [{ ...base.stages[0], passed: 0, cases }] };
}

describe('書く問題（穴埋め。F-STEP-3・7・9）', () => {
  it('ひな形・書くのはここ・まだの松明を出し、実行して全部通ればクリアを記録する', async () => {
    const { user, runner } = await renderApp('/step/ch00.sample-fill');
    expect(
      await screen.findByRole('heading', { level: 1, name: '見本の穴埋め' }),
    ).toBeInTheDocument();
    expect(editorText()).toContain('System.out.println("____");');
    expect(screen.getByText('▼ 書くのはここ（3行目）')).toBeInTheDocument();
    const tests = screen.getByRole('region', { name: 'テスト' });
    expect(within(tests).getByText('まだ')).toBeInTheDocument();
    expect(within(tests).getByText('0 / 1 本ともった')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /実行/ }));

    expect(await within(tests).findByText('1 本の松明が全部ともった')).toBeInTheDocument();
    expect(within(tests).getByText('通過')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'ステップクリア' })).toBeInTheDocument();
    expect(screen.getByText('文字列は " で囲む。', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '次のステップへ（約1分）' })).toHaveAttribute(
      'href',
      '/step/ch00.sample-fix',
    );
    expect(screen.getByRole('link', { name: 'ここで終える' })).toHaveAttribute('href', '/');
    expect(screen.getByText('テスト 1 本中 1 本が通りました')).toBeInTheDocument();

    expect(runner.calls[0]).toMatchObject({
      stepId: 'ch00.sample-fill',
      rev: 2,
      source: 'compact',
    });
    expect(runner.calls[0].learnerFiles[0].content).toContain('"____"');
    await waitFor(async () =>
      expect((await v2db.progress.get('ch00.sample-fill'))?.status).toBe('cleared'),
    );
    const p = await v2db.progress.get('ch00.sample-fill');
    expect(p).toMatchObject({ points: 3, clearedRev: 2, attemptCount: 1 });
    expect((await v2db.attempts.toArray()).map((a) => a.result)).toEqual(['pass']);
  });

  it('失敗したら、期待と実際を行ごとに並べる（赤は使わない）', async () => {
    const runner = createFakeRunner({ respond: (job) => failedResult(job, 'ようこそ\n村\n') });
    const { user } = await renderApp('/step/ch00.sample-fill', runner);
    await screen.findByRole('heading', { level: 1, name: '見本の穴埋め' });
    await user.click(screen.getByRole('button', { name: /実行/ }));
    expect(await screen.findByRole('heading', { name: '期待と実際の違い' })).toBeInTheDocument();
    expect(screen.getByText('0 / 1 本ともった')).toBeInTheDocument();
    expect(screen.getAllByText('期待').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'ステップクリア' })).not.toBeInTheDocument();
    await waitFor(async () =>
      expect((await v2db.progress.get('ch00.sample-fill'))?.status).toBe('trying'),
    );
  });

  it('コンパイルエラーは、行と原文を出し、その行へ移動できる', async () => {
    const runner = createFakeRunner({
      respond: () => ({
        kind: 'compile-error',
        diagnostics: [
          {
            file: 'Main.java',
            line: 3,
            column: 5,
            severity: 'error',
            message: 'unclosed string literal',
            origin: 'learner',
          },
        ],
      }),
    });
    const { user } = await renderApp('/step/ch00.sample-fix', runner);
    await screen.findByRole('heading', { level: 1, name: '見本の修理' });
    await user.click(screen.getByRole('button', { name: /実行/ }));
    expect(await screen.findByRole('heading', { name: 'エラーの説明' })).toBeInTheDocument();
    expect(screen.getByText('3行目 5文字目')).toBeInTheDocument();
    expect(screen.getAllByText('コンパイルエラー 1件（3行目）').length).toBeGreaterThan(0);
    expect(screen.getByText('コンパイルが通ると松明に火が入ります')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '3行目へ移動' }));
    expect(document.activeElement?.closest('.cm-editor')).not.toBeNull();
    expect((await v2db.attempts.toArray())[0]?.result).toBe('compile-error');
  });

  it('時間切れは、何秒で止めたかと途中までの出力を出す', async () => {
    const runner = createFakeRunner({
      respond: () => ({
        kind: 'timeout',
        partialOutput: '#####\n',
        doneStages: [],
        timeoutMs: 1000,
      }),
    });
    const { user } = await renderApp('/step/ch00.sample-draw', runner);
    await screen.findByRole('heading', { level: 1, name: '見本の絵' });
    await user.click(screen.getByRole('button', { name: /実行/ }));
    expect(
      await screen.findByText('1秒たっても終わらなかった（無限ループかも）'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'タイル 5×1。壁5' })).toBeInTheDocument();
  });

  it('書きかけは入力が止まって1秒後に保存し、開き直すと続きから。開いただけでは new のまま', async () => {
    const first = await renderApp('/step/ch00.sample-fill');
    await screen.findByRole('heading', { level: 1, name: '見本の穴埋め' });
    expect((await v2db.progress.get('ch00.sample-fill'))?.status).toBe('new');
    typeInEditor('void main() {\n    System.out.println("つづき");\n}\n');
    expect(await screen.findByText('自動保存済み')).toBeInTheDocument();
    const draft = await v2db.drafts.get('ch00.sample-fill');
    expect(draft?.rev).toBe(2);
    expect(typeof draft?.cursorLine).toBe('number');
    expect(draft?.files['Main.java']).toContain('つづき');
    expect((await v2db.progress.get('ch00.sample-fill'))?.status).toBe('trying');
    first.unmount();

    await renderApp('/step/ch00.sample-fill');
    await screen.findByRole('heading', { level: 1, name: '見本の穴埋め' });
    expect(editorText()).toContain('つづき');
  });

  it('教材の rev が書きかけと違えば知らせる。「最初のコードに戻す」は確かめてから戻す（F-STEP-13）', async () => {
    await v2db.drafts.put({
      stepId: 'ch00.sample-fill',
      rev: 1,
      files: { 'Main.java': '古いコード' },
      cursorLine: 1,
      updatedAt: '2026-11-30T10:00:00.000Z',
    });
    const { user } = await renderApp('/step/ch00.sample-fill');
    expect(
      await screen.findByText('問題が新しくなりました。書きかけは残しています'),
    ).toBeInTheDocument();
    expect(editorText()).toBe('古いコード');
    await user.click(screen.getByRole('button', { name: '最初のコードに戻す' }));
    await user.click(screen.getByRole('button', { name: '戻す' }));
    expect(editorText()).toContain('"____"');
    await waitFor(async () => expect((await v2db.drafts.get('ch00.sample-fill'))?.rev).toBe(2));
  });

  it('ヒントは押した段だけ開き、使った最高の段を残す（F-STEP-8）', async () => {
    const { user } = await renderApp('/step/ch00.sample-fill');
    await screen.findByRole('heading', { level: 1, name: '見本の穴埋め' });
    expect(screen.getByRole('button', { name: /ヒント 3 を見る/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'ヒント 1 を見る' }));
    expect(screen.getByText('println を使う。')).toBeInTheDocument();
    expect(screen.queryByText('2行目も出す。')).not.toBeInTheDocument();
    await waitFor(async () =>
      expect((await v2db.progress.get('ch00.sample-fill'))?.maxHint).toBe(1),
    );
  });

  it('非対応のブラウザでは「Chrome で開く」の案内を出す（N-BR-2）', async () => {
    await renderApp('/step/ch00.sample-fill', createUnsupportedRunner() as never);
    expect(
      await screen.findByText(
        'このブラウザでは Java を動かせません。Chrome で開くか、『手元で実行』を使ってください',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'URL をコピー' })).toBeInTheDocument();
  });

  it('見つからないステップ', async () => {
    await renderApp('/step/ch00.nothing');
    expect(
      await screen.findByRole('heading', { name: 'このステップは見つかりません' }),
    ).toBeInTheDocument();
  });
});

describe('予想・クイズ（F-STEP-2）', () => {
  it('入力で答える。違えば差分と解説、もう一度答えて正解ならクリア', async () => {
    const { user } = await renderApp('/step/ch00.sample-predict');
    await screen.findByRole('heading', { level: 1, name: '見本の予想' });
    const box = screen.getByRole('textbox', { name: '出力を予想して入力' });
    await user.type(box, 'A{Enter}C');
    await user.click(screen.getByRole('button', { name: '答える' }));
    expect(await screen.findByText('ちがいました')).toBeInTheDocument();
    expect(screen.getByText('2行出る。')).toBeInTheDocument();
    expect((await v2db.progress.get('ch00.sample-predict'))?.status).toBe('trying');

    await user.click(screen.getByRole('button', { name: 'もう一度答える' }));
    await user.clear(box);
    await user.type(box, 'Ａ{Enter}B  ');
    await user.click(screen.getByRole('button', { name: '答える' }));
    expect(await screen.findByText('正解')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await v2db.progress.get('ch00.sample-predict')).toMatchObject({
        status: 'cleared',
        points: 2,
      }),
    );
    // 時刻は固定なので、並びは問わない
    expect((await v2db.attempts.toArray()).map((a) => `${a.result}/${a.where}`).sort()).toEqual([
      'pass/none',
      'wrong-answer/none',
    ]);
  });

  it('選択肢で答える', async () => {
    const { user } = await renderApp('/step/ch00.sample-choice');
    await screen.findByRole('heading', { level: 1, name: '見本の選択肢' });
    expect(screen.getByRole('button', { name: '答える' })).toBeDisabled();
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: '答える' }));
    expect(await screen.findByText('正解')).toBeInTheDocument();
  });

  it('答えたあとで「動かして確かめる」と出力を出す', async () => {
    const runner = createFakeRunner({ respond: (job) => passedResult(job, 'A\nB\n') });
    const { user } = await renderApp('/step/ch00.sample-predict', runner);
    await screen.findByRole('heading', { level: 1, name: '見本の予想' });
    expect(screen.queryByRole('button', { name: /動かして確かめる/ })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '出力を予想して入力' }), 'A{Enter}B');
    await user.click(screen.getByRole('button', { name: '答える' }));
    await user.click(await screen.findByRole('button', { name: /動かして確かめる/ }));
    await waitFor(() => expect(runner.calls).toHaveLength(1));
    expect(runner.calls[0].stages).toEqual([]);
  });
});

describe('説明カード（F-STEP-1）', () => {
  it('例のコードを動かせて、「わかった」でクリア', async () => {
    const runner = createFakeRunner({ respond: (job) => passedResult(job, '見本\n') });
    const { user } = await renderApp('/step/ch00.sample-card', runner);
    await screen.findByRole('heading', { level: 1, name: '見本の説明カード' });
    await user.click(screen.getByRole('button', { name: /動かしてみる/ }));
    expect(await screen.findByText('見本')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'わかった' }));
    expect(await screen.findByRole('link', { name: '次のステップへ（約1分）' })).toHaveAttribute(
      'href',
      '/step/ch00.sample-predict',
    );
    expect(await v2db.progress.get('ch00.sample-card')).toMatchObject({
      status: 'cleared',
      points: 1,
    });
  });
});
