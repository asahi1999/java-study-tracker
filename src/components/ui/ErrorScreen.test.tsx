import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorScreen } from './ErrorScreen';

describe('ErrorScreen', () => {
  it('何が起きたか、どうすればいいか、エラーの内容を伝える', () => {
    render(<ErrorScreen message="InvalidStateError: database is closed" />);

    const alert = screen.getByRole('alert');
    expect(
      within(alert).getByRole('heading', { name: 'データを読み込めませんでした' }),
    ).toBeInTheDocument();
    expect(within(alert).getByText(/通常のウィンドウで開き直してください/)).toBeInTheDocument();
    expect(within(alert).getByText('InvalidStateError: database is closed')).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
  });
});
