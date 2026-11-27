// 結果の列の部品: エラーの説明（フェーズ1は原文と行だけ。設計書 4-7）、失敗したケースの差分
import type { CaseResult, RunResult } from '@/runtime/java/JavaRunner';

import { DiffView } from './DiffView';
import { simpleTypeName, stopReason } from './runSummary';

type ErrorProps = { result: RunResult; onJumpToLine: (line: number) => void };

const ORIGIN_NOTE = {
  given: '配っているファイルのエラーです。',
  tests: '判定用のコードでエラー。教材の不具合かもしれません。',
  harness: '判定用のコードでエラー。教材の不具合かもしれません。',
} as const;

export function ErrorPanel({ result, onJumpToLine }: ErrorProps) {
  if (result.kind === 'compile-error') {
    const sorted = [...result.diagnostics].sort(
      (a, b) => Number(b.origin === 'learner') - Number(a.origin === 'learner'),
    );
    const shown = sorted.slice(0, 5);
    return (
      <section aria-labelledby="error-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="error-heading" className="font-display text-display-s">
            エラーの説明
          </h2>
          <p className="text-xs text-ink-dim">コンパイルの段階で止まりました</p>
        </div>
        <ul className="mt-3 grid gap-3">
          {shown.map((d, i) => (
            <li key={i} className={i === 0 ? '' : 'opacity-80'}>
              {d.origin === 'learner' ? (
                <p className="text-xs font-bold text-ember">
                  {d.line}行目 {d.column}文字目
                </p>
              ) : (
                <p className="text-xs font-bold text-ember">{ORIGIN_NOTE[d.origin]}</p>
              )}
              <pre className="on-well mt-1 whitespace-pre-wrap break-words bg-well p-2 font-mono text-code-sm text-well-ink">
                {d.origin === 'learner' ? d.message : `${d.file}:${d.line}: ${d.message}`}
              </pre>
              {d.origin === 'learner' && (
                <button
                  type="button"
                  onClick={() => onJumpToLine(d.line)}
                  className="notch-4 mt-2 h-8 bg-panel-2 px-3 text-xs font-bold hover:bg-line focus-visible:shadow-focus-in focus-visible:outline-none"
                >
                  {d.line}行目へ移動
                </button>
              )}
            </li>
          ))}
        </ul>
        {result.diagnostics.length > shown.length && (
          <p className="mt-2 text-xs text-ink-faint">
            ほかに {result.diagnostics.length - shown.length} 件
          </p>
        )}
      </section>
    );
  }
  const reason = stopReason(result);
  if (!reason) return null;
  const line = result.kind === 'precheck' ? result.line : null;
  return (
    <section aria-labelledby="error-heading">
      <h2 id="error-heading" className="font-display text-display-s">
        止まった理由
      </h2>
      <p className="mt-2 text-sm">{reason}</p>
      {line !== null && (
        <button
          type="button"
          onClick={() => onJumpToLine(line)}
          className="notch-4 mt-2 h-8 bg-panel-2 px-3 text-xs font-bold hover:bg-line focus-visible:shadow-focus-in focus-visible:outline-none"
        >
          {line}行目へ移動
        </button>
      )}
    </section>
  );
}

/** 判定のケースのうち、失敗したもの */
export function failedCases(result: RunResult | null): CaseResult[] {
  if (!result || result.kind !== 'judged') return [];
  return result.stages.flatMap((s) => (s.stage >= 1 ? s.cases.filter((c) => c.ok === false) : []));
}

export function FailureList({ cases }: { cases: CaseResult[] }) {
  if (cases.length === 0) return null;
  return (
    <section aria-labelledby="fail-heading">
      <h2 id="fail-heading" className="font-display text-display-s">
        期待と実際の違い
      </h2>
      <ul className="mt-3 grid gap-4">
        {cases.slice(0, 3).map((c) => (
          <li key={c.index}>
            <p className="mb-1 text-sm font-bold">{c.name}</p>
            {c.error ? (
              <p className="text-sm">
                {simpleTypeName(c.error.type)}
                {c.error.line ? ` ${c.error.line}行目` : ''} で止まりました
              </p>
            ) : (
              c.expected !== null && <DiffView expected={c.expected} actual={c.actual} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
