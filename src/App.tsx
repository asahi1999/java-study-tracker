import { useLiveQuery } from 'dexie-react-hooks';

import {
  monthRepository,
  skillRepository,
  stepRepository,
  weekRepository,
} from '@/db/repositories';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';

// フェーズ1時点の仮画面。初期データが入ったことを確認するためのもので、
// フェーズ2でレイアウトとルーティングに置き換える
export default function App() {
  const bootstrap = useAppBootstrap();

  if (bootstrap.status === 'loading') {
    return <p className="p-6 text-slate-600">読み込み中…</p>;
  }

  if (bootstrap.status === 'error') {
    return (
      <div role="alert" className="p-6 text-red-700">
        <p className="font-bold">データベースを開けませんでした。</p>
        <p className="mt-1 text-sm">{bootstrap.message}</p>
      </div>
    );
  }

  return <SeedSummary />;
}

function SeedSummary() {
  const counts = useLiveQuery(async () => {
    const [months, steps, weeks, skills] = await Promise.all([
      monthRepository.getAll(),
      stepRepository.getAll(),
      weekRepository.getAll(),
      skillRepository.getAll(),
    ]);
    return {
      months: months.length,
      steps: steps.length,
      weeks: weeks.length,
      skills: skills.length,
    };
  });

  if (!counts) return null;

  return (
    <main className="mx-auto max-w-md p-6 text-slate-900">
      <h1 className="text-xl font-bold">Java Study Tracker</h1>
      <p className="mt-2 text-sm text-slate-600">初期データを読み込みました。</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 tabular-nums">
        <dt>月</dt>
        <dd>{counts.months}</dd>
        <dt>ステップ</dt>
        <dd>{counts.steps}</dd>
        <dt>週</dt>
        <dd>{counts.weeks}</dd>
        <dt>チェック項目</dt>
        <dd>{counts.skills}</dd>
      </dl>
    </main>
  );
}
