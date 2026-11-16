import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from './ProgressBar';

function renderBar(value: number) {
  render(<ProgressBar value={value} label="全体の進捗" />);
  return screen.getByRole('progressbar', { name: '全体の進捗' });
}

describe('ProgressBar', () => {
  it('現在の値と範囲を読み上げ用の属性に入れる', () => {
    const bar = renderBar(40);

    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('値に応じた幅で塗る', () => {
    const bar = renderBar(40);

    expect(bar.firstElementChild).toHaveStyle({ width: '40%' });
  });

  it('小数は四捨五入する', () => {
    expect(renderBar(37.5)).toHaveAttribute('aria-valuenow', '38');
  });

  it.each([
    [150, '100'],
    [-20, '0'],
    [Number.NaN, '0'],
    [Number.POSITIVE_INFINITY, '0'],
  ])('範囲外の値 %s は %s として扱う', (value, expected) => {
    expect(renderBar(value)).toHaveAttribute('aria-valuenow', expected);
  });
});
