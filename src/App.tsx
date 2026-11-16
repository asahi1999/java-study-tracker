import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { useApplyTheme } from '@/hooks/useTheme';
import { BadgesPage } from '@/pages/BadgesPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EditorPage } from '@/pages/EditorPage';
import { LogsPage } from '@/pages/LogsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RoadmapPage } from '@/pages/RoadmapPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StatsPage } from '@/pages/StatsPage';
import { WeekDetailPage } from '@/pages/WeekDetailPage';

/** URLと画面の対応。テストでは別のルーターで包んで使うため、ルーター本体とは分けている */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="roadmap/:weekId" element={<WeekDetailPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="badges" element={<BadgesPage />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const bootstrap = useAppBootstrap();
  useApplyTheme();

  if (bootstrap.status === 'loading') return <LoadingScreen />;
  if (bootstrap.status === 'error') return <ErrorScreen message={bootstrap.message} />;

  // GitHub Pages はサーバー側でURLを書き換えられないので、# 以降でページを切り替える HashRouter を使う
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
