// 設計書 12-2 の 1・2。見本の教材（tests/content-fixtures/good）で、本物の teavm-javac を Worker で動かす
import { expect, type Page, test } from '@playwright/test';

/** CSP の違反とページのエラーを集める */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

async function replaceCode(page: Page, code: string) {
  const editor = page.locator('.cm-content').first();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
}

test('1. 初回起動 → ホームに最初のステップ → 小問を解いて松明が全部ともる（CSP つき。エディタに色が付く）', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('./');

  // 本番のビルドには CSP の <meta> が付いている
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");

  await expect(page.getByRole('heading', { level: 1, name: '見本の説明カード' })).toBeVisible();
  await expect(page.getByRole('link', { name: /つづける/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'わかった' })).toBeVisible();

  await page.goto('./#/step/ch00.sample-fill');
  await expect(page.getByRole('heading', { level: 1, name: '見本の穴埋め' })).toBeVisible();

  // エディタに構文の色が付く（CSP の style-src で CodeMirror の <style> が止められていない）
  const keyword = page.locator('.cm-line', { hasText: 'void main' }).locator('span').first();
  await expect(keyword).toHaveText('void');
  await expect(keyword).toHaveCSS('color', 'rgb(201, 181, 255)');

  await replaceCode(
    page,
    'void main() {\n    System.out.println("ようこそ");\n    System.out.println("見本の村");\n}\n',
  );
  await page.getByRole('button', { name: /実行/ }).click();

  const tests = page.getByRole('region', { name: 'テスト' });
  await expect(tests.getByText('1 本の松明が全部ともった')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ステップクリア' })).toBeVisible();
  await expect(page.getByText(/コンパイル OK ・ 実行/)).toBeVisible();

  // 再読み込みしても、書きかけが残る
  await page.reload();
  await expect(page.locator('.cm-content')).toContainText('見本の村');

  expect(errors).toEqual([]);
});

test('2. 無限ループのコード → 時間切れの表示、画面は固まらない', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./#/step/ch00.sample-draw');
  await expect(page.getByRole('heading', { level: 1, name: '見本の絵' })).toBeVisible();

  await replaceCode(
    page,
    'void main() {\n    System.out.println("#####");\n    while (true) {\n    }\n}\n',
  );
  await page.getByRole('button', { name: /実行/ }).click();
  await expect(page.getByText('1秒たっても終わらなかった（無限ループかも）')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'エディタ' }).getByText('時間切れ（1.0 秒）'),
  ).toBeVisible();

  // 画面は動く: ヒントを開ける・直して実行し直せる
  await page.getByRole('button', { name: 'ヒント 1 を見る' }).click();
  await expect(page.getByText('壁は #。')).toBeVisible();
  await replaceCode(
    page,
    'void main() {\n    System.out.println("#####");\n    System.out.println("#.@.#");\n    System.out.println("#####");\n}\n',
  );
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(
    page.getByRole('region', { name: 'テスト' }).getByText('1 本の松明が全部ともった'),
  ).toBeVisible();

  expect(errors).toEqual([]);
});
