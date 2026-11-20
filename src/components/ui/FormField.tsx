import { type ReactNode, useId } from 'react';

import { ERROR_CLASS, LABEL_CLASS } from './field';

/**
 * 設定画面などで入力欄を横に並べるときの並べ方。スマホは2列、PCは3列にして、
 * 画面ごとに入力欄の幅がばらばらにならないようにする
 */
export const FIELD_GRID_CLASS = 'grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3';

/** 入力欄に渡す属性。ラベル・補足・エラーとのつながりを持つ */
export type FieldControlProps = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
};

type FormFieldProps = {
  label: string;
  /** 入力欄の下に出す補足 */
  hint?: string;
  /** 入力チェックのエラー。あれば補足の下に赤で出す */
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * ラベル・入力欄・補足・エラーをひとまとめにした入力項目。
 * 入力欄の id や aria 属性を毎回書かずに済むよう、children に渡す
 */
export function FormField({ label, hint, error, className, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className="mt-1 text-[12px] leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
