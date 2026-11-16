import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded font-bold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  // 画面の中でいちばん押してほしい操作。1画面に1つまでにする
  primary: 'bg-accent text-accent-ink hover:bg-accent/85',
  secondary: 'border-[1.5px] border-ink text-ink hover:bg-ink/5',
  ghost: 'text-ink hover:bg-ink/5',
  // 削除やリセットなど、取り消せない操作
  danger: 'border-[1.5px] border-status-red text-status-red-fg hover:bg-status-red-bg',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-10 px-4 text-sm',
  sm: 'min-h-8 px-3 text-[13px]',
};

type ButtonStyle = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

/** ボタンの見た目のクラス名を返す。リンクをボタンの見た目にしたいときにも使う */
export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  className,
}: ButtonStyle = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle;

export function Button({ variant, size, className, type = 'button', ...rest }: ButtonProps) {
  // type の初期値を button にする。フォームの中で意図せず送信されるのを防ぐため
  return <button type={type} className={buttonClassName({ variant, size, className })} {...rest} />;
}
