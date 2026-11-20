import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { useApplyTheme } from '@/hooks/useTheme';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// 最初に開くダッシュボード以外のページは、開いたときに読み込む。
// グラフ（統計）や Markdown（週の詳細）のライブラリが大きく、全部を最初に読み込むと表示が遅くなるため
const RoadmapPage = lazy(() =>
  import('@/pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage })),
);
const WeekDetailPage = lazy(() =>
  import('@/pages/WeekDetailPage').then((m) => ({ default: m.WeekDetailPage })),
);
const LogsPage = lazy(() => import('@/pages/LogsPage').then((m) => ({ default: m.LogsPage })));
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const BadgesPage = lazy(() =>
  import('@/pages/BadgesPage').then((m) => ({ default: m.BadgesPage })),
);
const EditorPage = lazy(() =>
  import('@/pages/EditorPage').then((m) => ({ default: m.EditorPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

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
