// URL と画面の対応（設計書 1-1）。フェーズ1はホームとステップだけ。v1 の画面はルートから外した（ファイルはフェーズ3で消す）
import { Route, Routes } from 'react-router-dom';

import { HomePage } from '@/features/home/HomePage';
import { StepPage } from '@/features/step/StepPage';

import { AppLayout } from './layout/AppLayout';
import { NotFound } from './NotFound';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="step/:stepId" element={<StepPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
