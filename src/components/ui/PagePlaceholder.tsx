import { Construction } from 'lucide-react';

import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';

type PagePlaceholderProps = {
  title: string;
};

// まだ中身を作っていない画面に置く仮の表示。各フェーズで本来の画面に置き換えていく
export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={Construction}
          title="この画面は準備中です"
          description="今後の更新で使えるようになります。"
        />
      </Card>
    </>
  );
}
