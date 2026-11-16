import { Link } from 'react-router-dom';

import { buttonClassName } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        title="ページが見つかりません"
        description="URLが間違っているか、ページが移動した可能性があります。"
      />
      <Link to="/" className={buttonClassName({ variant: 'primary' })}>
        ダッシュボードへ戻る
      </Link>
    </>
  );
}
