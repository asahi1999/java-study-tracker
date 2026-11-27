// ボタンの見た目（05-visual-design.md 7-1）。主は1画面に1つ
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'md' | 'lg' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 font-sans transition-colors duration-fast ease-ui focus-visible:outline-none disabled:cursor-default';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'notch-4 bg-torch font-bold text-torch-ink shadow-press hover:bg-torch-hover focus-visible:shadow-[inset_0_-4px_0_rgb(var(--torch-press)),inset_0_0_0_2px_rgb(var(--torch-ink))] disabled:bg-panel-2 disabled:text-ink-faint disabled:shadow-edge',
  secondary:
    'notch-4 bg-panel-2 font-bold text-ink hover:bg-line focus-visible:shadow-focus-in disabled:text-ink-faint',
  ghost:
    'shadow-edge text-ink hover:bg-panel-2 focus-visible:shadow-focus-in disabled:text-ink-faint disabled:shadow-[inset_0_0_0_2px_rgb(var(--line))]',
  link: 'text-ink-dim underline underline-offset-2 hover:text-ink focus-visible:shadow-focus-in',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-[18px] text-sm',
  lg: 'h-14 min-w-[200px] px-7 text-lg',
};

export function buttonClass(variant: ButtonVariant, size: ButtonSize = 'md', extra = ''): string {
  const sizeClass = variant === 'link' ? 'text-sm' : SIZES[size];
  return `${BASE} ${VARIANTS[variant]} ${sizeClass} ${extra}`.trim();
}
