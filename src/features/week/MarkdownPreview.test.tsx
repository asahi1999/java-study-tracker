import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownPreview } from './MarkdownPreview';

describe('MarkdownPreview', () => {
  it('見出し・強調・リストを整形して表示する', () => {
    render(<MarkdownPreview source={'# 今日の学び\n\n**大事**な点\n\n- 変数\n- 配列'} />);

    expect(screen.getByRole('heading', { level: 1, name: '今日の学び' })).toBeInTheDocument();
    expect(screen.getByText('大事').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('表を表示できる', () => {
    render(<MarkdownPreview source={'| 型 | 例 |\n| --- | --- |\n| int | 1 |'} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '型' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'int' })).toBeInTheDocument();
  });

  it('チェックボックスつきのリストを表示できる', () => {
    render(<MarkdownPreview source={'- [x] 終わった\n- [ ] これから'} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('リンクは別のタブで開く', () => {
    render(<MarkdownPreview source="[公式ドキュメント](https://docs.oracle.com/javase/)" />);

    const link = screen.getByRole('link', { name: '公式ドキュメント' });
    expect(link).toHaveAttribute('href', 'https://docs.oracle.com/javase/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('メモに書かれたHTMLタグは実行せず、文字として扱う', () => {
    const { container } = render(
      <MarkdownPreview source={'<script>alert(1)</script><img src=x onerror=alert(1)>'} />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('空のときは、メモがないことを伝える', () => {
    render(<MarkdownPreview source={'  \n '} />);

    expect(screen.getByText('メモはまだありません。')).toBeInTheDocument();
  });
});
