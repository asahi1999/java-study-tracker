// 判定の行（設計書 5-4）を読む。行の頭（U+001E があればその後ろ）が "@@jq " の行を判定の行とする。
// 手元で貼られた出力では U+001E が消えることがあるので、"@@jq " だけでも受け付ける。
// 知らない t は無視する（あとで増やせるように）。

export type CaseError = { type: string; line: number | null; file: string | null };

export type JqEvent =
  | { t: 'hello'; v: number; step: string; rev: number; source: string }
  | {
      t: 'case';
      stage: number;
      i: number;
      name: string;
      ok: boolean | null;
      expected?: string | null;
      actual?: string | null;
      error: CaseError | null;
    }
  | {
      t: 'check';
      stage: number;
      name: string;
      ok: boolean;
      expected?: string;
      actual?: string;
      error?: CaseError | null;
    }
  | { t: 'stage'; stage: number; passed: number; total: number }
  | { t: 'done'; step: string; rev: number; passed: number; total: number }
  | { t: 'limit'; reason: 'output' };

export type CaseEvent = Extract<JqEvent, { t: 'case' }>;
export type CheckEvent = Extract<JqEvent, { t: 'check' }>;

const MARK = '@@jq ';
const RS = '\u001e';

export type ParsedOutput = {
  events: JqEvent[];
  /** 判定の行と、その直前の改行1つを取り除いた残り（画面に出す標準エラー） */
  text: string;
};

function isKnown(value: unknown): value is JqEvent {
  if (typeof value !== 'object' || value === null) return false;
  const t = (value as { t?: unknown }).t;
  return (
    t === 'hello' || t === 'case' || t === 'check' || t === 'stage' || t === 'done' || t === 'limit'
  );
}

export function parseProtocol(text: string): ParsedOutput {
  const events: JqEvent[] = [];
  let out = '';
  let pos = 0;
  while (pos <= text.length) {
    const nl = text.indexOf('\n', pos);
    const lineEnd = nl < 0 ? text.length : nl;
    let line = text.slice(pos, lineEnd);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    const body = line.startsWith(RS) ? line.slice(1) : line;
    if (body.startsWith(MARK)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.slice(MARK.length));
      } catch {
        parsed = null;
      }
      if (isKnown(parsed)) events.push(parsed);
      // 直前の改行1つを取り除く（ハーネスが判定の行の前に必ず書く改行）
      if (out.endsWith('\r\n')) out = out.slice(0, -2);
      else if (out.endsWith('\n')) out = out.slice(0, -1);
    } else {
      out += text.slice(pos, nl < 0 ? text.length : nl + 1);
    }
    if (nl < 0) break;
    pos = nl + 1;
  }
  return { events, text: out };
}

export type StageSummary = {
  stage: number;
  passed: number;
  total: number;
  cases: CaseEvent[];
  checks: CheckEvent[];
};

export type ProtocolSummary = {
  hello: Extract<JqEvent, { t: 'hello' }> | null;
  done: Extract<JqEvent, { t: 'done' }> | null;
  limit: boolean;
  /** 段階0（そのまま実行）のケース */
  asIs: CaseEvent | null;
  /** 段階1以降。stage の行が来ていない段階も、来たケースから作る */
  stages: StageSummary[];
};

export function summarize(events: JqEvent[]): ProtocolSummary {
  const summary: ProtocolSummary = {
    hello: null,
    done: null,
    limit: false,
    asIs: null,
    stages: [],
  };
  const stageOf = (n: number): StageSummary => {
    let s = summary.stages.find((x) => x.stage === n);
    if (!s) {
      s = { stage: n, passed: 0, total: 0, cases: [], checks: [] };
      summary.stages.push(s);
    }
    return s;
  };
  const finished = new Set<number>();
  for (const e of events) {
    switch (e.t) {
      case 'hello':
        summary.hello ??= e;
        break;
      case 'done':
        summary.done = e;
        break;
      case 'limit':
        summary.limit = true;
        break;
      case 'case':
        if (e.stage === 0) summary.asIs ??= e;
        else stageOf(e.stage).cases.push(e);
        break;
      case 'check':
        stageOf(e.stage).checks.push(e);
        break;
      case 'stage': {
        const s = stageOf(e.stage);
        s.passed = e.passed;
        s.total = e.total;
        finished.add(e.stage);
        break;
      }
    }
  }
  // stage の行が来ていない段階（途中で止まった）は、来たケースとテストから数える
  for (const s of summary.stages) {
    if (finished.has(s.stage)) continue;
    const items = [...s.cases.filter((c) => c.ok !== null), ...s.checks];
    s.total = items.length;
    s.passed = items.filter((c) => c.ok === true).length;
  }
  summary.stages.sort((a, b) => a.stage - b.stage);
  return summary;
}

/** 合格は「done があり、total ≥ 1 で、passed = total」のときだけ（設計書 5-4） */
export function isPassed(summary: ProtocolSummary): boolean {
  const d = summary.done;
  return d !== null && d.total >= 1 && d.passed === d.total;
}

/** 貼られた出力の問題 ID の確かめ（設計書 5-4）。hello・done の step が今の問題と違えば別の問題 */
export function checkStep(
  summary: ProtocolSummary,
  stepId: string,
  rev: number,
): 'same' | 'old-rev' | 'other-step' | 'unknown' {
  const step = summary.done?.step ?? summary.hello?.step;
  const r = summary.done?.rev ?? summary.hello?.rev;
  if (step === undefined) return 'unknown';
  if (step !== stepId) return 'other-step';
  return r === rev ? 'same' : 'old-rev';
}
