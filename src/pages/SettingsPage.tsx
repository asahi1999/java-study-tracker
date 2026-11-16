import { PageHeader } from '@/components/ui/PageHeader';
import { ThemeSetting } from '@/features/settings/ThemeSetting';

// テーマ以外の設定（開始日・目標時間・休止期間・データ管理）はフェーズ9で追加する
export function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" />
      <div className="grid gap-4">
        <ThemeSetting />
      </div>
    </>
  );
}
