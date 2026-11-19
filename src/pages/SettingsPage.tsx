import { useLiveQuery } from 'dexie-react-hooks';

import { LoadingText } from '@/components/ui/LoadingText';
import { PageHeader } from '@/components/ui/PageHeader';
import { settingsRepository } from '@/db/repositories';
import { BreakPeriodSettings } from '@/features/settings/BreakPeriodSettings';
import { ExportData } from '@/features/settings/ExportData';
import { ImportData } from '@/features/settings/ImportData';
import { ResetAllData } from '@/features/settings/ResetAllData';
import { ScheduleSettings } from '@/features/settings/ScheduleSettings';
import { ThemeSetting } from '@/features/settings/ThemeSetting';

export function SettingsPage() {
  const settings = useLiveQuery(() => settingsRepository.get());

  return (
    <>
      <PageHeader title="設定" />
      {/* 入力欄が横に伸びすぎないよう、幅を絞る */}
      <div className="grid max-w-3xl gap-4">
        <ThemeSetting />
        {settings ? (
          <>
            <ScheduleSettings settings={settings} />
            <BreakPeriodSettings settings={settings} />
          </>
        ) : (
          <LoadingText />
        )}
        <ExportData />
        <ImportData />
        <ResetAllData />
        <p className="text-[13px] text-muted">Java Study Tracker バージョン {__APP_VERSION__}</p>
      </div>
    </>
  );
}
