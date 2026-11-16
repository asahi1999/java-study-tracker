import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('見出しを付けると、その名前を持つ領域になる', () => {
    render(
      <Card title="今週の予定">
        <p>数当てゲーム</p>
      </Card>,
    );

    const card = screen.getByRole('region', { name: '今週の予定' });
    expect(within(card).getByRole('heading', { level: 2, name: '今週の予定' })).toBeInTheDocument();
    expect(within(card).getByText('数当てゲーム')).toBeInTheDocument();
  });

  it('見出しの横に操作を置ける', () => {
    render(
      <Card title="学習ログ" action={<a href="#/logs">すべて見る</a>}>
        <p>本文</p>
      </Card>,
    );

    expect(screen.getByRole('link', { name: 'すべて見る' })).toBeInTheDocument();
  });

  it('見出しがなくても中身を表示する', () => {
    render(
      <Card>
        <p>本文だけ</p>
      </Card>,
    );

    expect(screen.getByText('本文だけ')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
