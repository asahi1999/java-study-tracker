// v2 の画面を、見本の教材と偽の JavaRunner で描く（設計書 14章）
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppRoutes } from '@/app/routes';
import { type AppServices, ServicesProvider } from '@/app/services';
import { createFakeRunner, type FakeRunner } from '@/runtime/java/fakeRunner';

import { fixtureContent } from './contentFixture';

export const NOW = new Date('2026-12-01T10:00:00.000Z');

export async function renderApp(path: string, runner: FakeRunner = createFakeRunner()) {
  const content = await fixtureContent();
  const services: AppServices = { runner, content, now: () => NOW };
  const user = userEvent.setup();
  const view = render(
    <ServicesProvider services={services}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </ServicesProvider>,
  );
  return { ...view, user, runner, content };
}
