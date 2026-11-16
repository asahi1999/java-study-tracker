import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressRing } from './ProgressRing';

function renderRing(value: number) {
  render(
    <ProgressRing value={value} label="全体の進捗">
      <span>{value}%</span>
    </ProgressRing>,
  );
  return screen.getByRole('progressbar', { name: '全体の進捗' });
}

describe('ProgressRing', () => {
  it('現在の値と範囲を読み上げ用の属性に入れる', () => {
    const ring = renderRing(40);

    expect(ring).toHaveAttribute('aria-valuenow', '40');
    expect(ring).toHaveAttribute('aria-valuemin', '0');
    expect(ring).toHaveAttribute('aria-valuemax', '100');
  });

  it('輪の中に子要素を表示する', () => {
    renderRing(40);

    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('値が大きいほど、塗られていない部分が短くなる', () => {
    const offsetOf = (value: number) => {
      const { container, unmount } = render(<ProgressRing value={value} label="進捗" />);
      const offset = Number(
        container.querySelectorAll('circle')[1]?.getAttribute('stroke-dashoffset'),
      );
      unmount();
      return offset;
    };

    expect(offsetOf(75)).toBeLessThan(offsetOf(25));
  });

  it('100% のときは輪をすべて塗る', () => {
    const ring = renderRing(100);

    expect(ring.querySelectorAll('circle')[1]).toHaveAttribute('stroke-dashoffset', '0');
  });

  it.each([
    [-10, '0'],
    [150, '100'],
    [Number.NaN, '0'],
  ])('範囲外の値 %s は %s に丸める', (value, expected) => {
    expect(renderRing(value)).toHaveAttribute('aria-valuenow', expected);
  });
});
