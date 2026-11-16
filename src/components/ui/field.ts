// 入力欄まわりの共通の見た目。フォームごとに書き方がずれないよう、ここにまとめている

export const LABEL_CLASS = 'block text-[13px] font-bold';

const FIELD_BASE =
  'mt-1 block w-full rounded border-[1.5px] border-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 aria-[invalid=true]:border-status-red';

/** 1行の入力欄・選択欄 */
export const INPUT_CLASS = `${FIELD_BASE} h-10`;

/** 複数行の入力欄 */
export const TEXTAREA_CLASS = `${FIELD_BASE} py-2 leading-relaxed`;

/** 入力欄の下に出すエラーメッセージ */
export const ERROR_CLASS = 'mt-1 text-[13px] leading-relaxed text-status-red-fg';
