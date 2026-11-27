// v2 のアプリの入口
import { useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { TileSprites } from '@/components/tiles/TileSprites';
import { createGeneratedContent } from '@/content/loader';
import { browserHarness } from '@/runtime/java/harnessSources';
import { createUnsupportedRunner, isWasmGcSupported } from '@/runtime/java/support';
import { createTeavmRunner } from '@/runtime/java/teavmRunner';

import { AppRoutes } from './routes';
import { type AppServices, ServicesProvider } from './services';
import { useApplyTheme } from './useApplyTheme';
import { useBoot } from './useBoot';

function createServices(): { services: AppServices; supported: boolean } {
  const supported = isWasmGcSupported();
  return {
    supported,
    services: {
      runner: supported
        ? createTeavmRunner({ baseUrl: import.meta.env.BASE_URL, harness: browserHarness })
        : createUnsupportedRunner(),
      content: createGeneratedContent(),
      now: () => new Date(),
    },
  };
}

export function AppShell({ services, supported }: { services: AppServices; supported: boolean }) {
  const boot = useBoot(services, supported);
  useApplyTheme();

  if (boot.status === 'loading') {
    return (
      <p role="status" className="p-8 text-sm text-ink-dim">
        読み込み中…
      </p>
    );
  }
  if (boot.status === 'error') {
    return (
      <div role="alert" className="p-8">
        <p className="text-base">{boot.message}</p>
        <button type="button" className="mt-4 underline" onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }
  return (
    <ServicesProvider services={services}>
      <TileSprites />
      {/* GitHub Pages はサーバー側で URL を書き換えられないので、# 以降で画面を切り替える */}
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ServicesProvider>
  );
}

export default function App() {
  const [{ services, supported }] = useState(createServices);
  return <AppShell services={services} supported={supported} />;
}
