import { type FormEvent, type ReactNode, useState } from 'react';
import type { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { ERROR_CLASS } from '@/components/ui/field';
import { Modal } from '@/components/ui/Modal';
import { getFieldErrors } from '@/lib/validation';

/** 入力欄を描くときに受け取るもの */
export type FormControls<V> = {
  values: V;
  errors: Record<string, string>;
  setValue: <K extends keyof V>(key: K, value: V[K]) => void;
};

/** 入力欄の値はすべて文字列で持ち、数値への変換はスキーマに任せる */
type FormSchema = z.ZodType<unknown, Record<string, string>>;

type FormModalProps<S extends FormSchema> = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 保存するボタンの文字（例：「週を追加」「変更を保存」） */
  submitLabel: string;
  schema: S;
  /** 開いたときの入力欄の値 */
  initialValues: z.input<S>;
  /** 入力チェックを通った値を保存する */
  onSubmit: (data: z.output<S>) => Promise<unknown>;
  children: (controls: FormControls<z.input<S>>) => ReactNode;
};

/**
 * 月・ステップ・週の追加と編集に使うダイアログ。
 * 送信したときに Zod で検証し、エラーは項目ごとに入力欄の下へ出す
 */
export function FormModal<S extends FormSchema>({
  open,
  onClose,
  title,
  ...rest
}: FormModalProps<S>) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {/* Modal は開いている間だけ中身を描画するので、開くたびに入力欄は初期値に戻る */}
      <ModalForm onClose={onClose} {...rest} />
    </Modal>
  );
}

function ModalForm<S extends FormSchema>({
  onClose,
  submitLabel,
  schema,
  initialValues,
  onSubmit,
  children,
}: Omit<FormModalProps<S>, 'open' | 'title'>) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const setValue = <K extends keyof z.input<S>>(key: K, value: z.input<S>[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await onSubmit(result.data);
      onClose();
    } catch {
      setErrors({ form: '保存できませんでした。もう一度試してください。' });
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {children({ values, errors, setValue })}

      {errors.form && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.form}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>キャンセル</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
