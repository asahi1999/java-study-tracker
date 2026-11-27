// 本物の JavaRunner（設計書 4-2〜4-4）。compile.worker を1つ常駐させ、実行ごとに run.worker を作る。
// - 時間切れ: run.worker の started を受けてから timeoutMs で terminate()（Wasm の読み込みは含めない）
// - 出力の上限: run.worker の limit を受けたら terminate()（ハーネスの JqCapture と二重の守り）
// - コンパイル: 15秒で応答がなければ compile.worker を作り直す。内部のエラーは作り直して1回だけやり直す
// - 50回コンパイルするごとに compile.worker を作り直す（長く使ったときのメモリの増え方に備える）
import type { HarnessSources } from '../../domain/java/harness.ts';
import { PRECHECK_MESSAGE, precheckCompact } from '../../domain/java/precheck.ts';
import { type JavaManifest, TEAVM_DIR, TEAVM_FILES } from './assets.ts';
import { assembleJob } from './core/assemble.ts';
import type {
  AssetUrls,
  CompileIn,
  CompileOut,
  RawDiagnostic,
  RunIn,
  RunOut,
} from './core/messages.ts';
import { buildRunResult, mapDiagnostics, type RawRun } from './core/result.ts';
import type { JavaRunner, LiveChunk, RunJob, RunnerStatus, RunResult } from './JavaRunner.ts';

/** Worker の、ここで使う部分だけ（テストで偽物に差し替える） */
export type WorkerLike = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

export type TeavmRunnerOptions = {
  /** public/ の URL（import.meta.env.BASE_URL）。最後に / を付ける */
  baseUrl: string;
  harness: HarnessSources;
  createCompileWorker?: () => WorkerLike;
  createRunWorker?: () => WorkerLike;
  /** manifest.json を読む（既定は fetch）。読めなければ大きさなしで進める */
  loadManifest?: () => Promise<JavaManifest | null>;
  /** Service Worker がページを管理するのを待つ（4-10。既定は navigator.serviceWorker を見る） */
  waitForServiceWorker?: () => Promise<void>;
  compileTimeoutMs?: number;
  recycleAfter?: number;
  now?: () => number;
};

const COMPILE_TIMEOUT_MS = 15_000;
const RECYCLE_AFTER = 50;
const SW_WAIT_MS = 10_000;

function defaultCompileWorker(): WorkerLike {
  return new Worker(new URL('./compile.worker.ts', import.meta.url), {
    type: 'module',
  }) as WorkerLike;
}

function defaultRunWorker(): WorkerLike {
  return new Worker(new URL('./run.worker.ts', import.meta.url), { type: 'module' }) as WorkerLike;
}

/** Service Worker がページを管理するまで待つ。登録が無い（開発サーバーなど）なら待たない。10秒で諦める */
async function defaultWaitForServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  if (sw.controller) return;
  const registration = await sw.getRegistration().catch(() => undefined);
  if (!registration) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, SW_WAIT_MS);
    sw.addEventListener('controllerchange', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

type CompileReply =
  | { kind: 'compiled'; wasm: ArrayBuffer }
  | { kind: 'compile-error'; diagnostics: RawDiagnostic[] }
  | { kind: 'internal-error'; message: string }
  | { kind: 'timeout' }
  | { kind: 'cancelled' };

export function createTeavmRunner(options: TeavmRunnerOptions): JavaRunner {
  const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
  const dir = `${base}${TEAVM_DIR}`;
  const absolute = (url: string) =>
    typeof location !== 'undefined' ? new URL(url, location.href).href : url;
  const assets: AssetUrls = {
    compilerWasm: absolute(dir + TEAVM_FILES.compilerWasm),
    runtimeJs: absolute(dir + TEAVM_FILES.runtimeJs),
    runtimeClasslib: absolute(dir + TEAVM_FILES.runtimeClasslib),
    compileClasslib: absolute(dir + TEAVM_FILES.compileClasslib),
    shimClasses: null,
    deobfuscator: absolute(dir + TEAVM_FILES.deobfuscator),
  };
  const createCompileWorker = options.createCompileWorker ?? defaultCompileWorker;
  const createRunWorker = options.createRunWorker ?? defaultRunWorker;
  const loadManifest =
    options.loadManifest ??
    (async () => {
      try {
        const res = await fetch(`${base}java/manifest.json`);
        return res.ok ? ((await res.json()) as JavaManifest) : null;
      } catch {
        return null;
      }
    });
  const waitForServiceWorker = options.waitForServiceWorker ?? defaultWaitForServiceWorker;
  const compileTimeoutMs = options.compileTimeoutMs ?? COMPILE_TIMEOUT_MS;
  const recycleAfter = options.recycleAfter ?? RECYCLE_AFTER;
  const now = options.now ?? (() => performance.now());

  let status: RunnerStatus = 'idle';
  let progress = 0;
  const listeners = new Set<(s: RunnerStatus, progress?: number) => void>();
  const setStatus = (s: RunnerStatus, p?: number) => {
    status = s;
    if (p !== undefined) progress = p;
    for (const l of listeners) l(s, s === 'downloading' ? progress : undefined);
  };

  let compileWorker: WorkerLike | null = null;
  let readyPromise: Promise<void> | null = null;
  let compileCount = 0;
  let seq = 0;
  const pendingCompiles = new Map<string, (reply: CompileReply) => void>();
  let sizes: Record<string, number> = {};

  // 実行中のもの（次の run か cancel で止める）
  let current: { cancel: () => void } | null = null;

  function dropCompileWorker() {
    compileWorker?.terminate();
    compileWorker = null;
    readyPromise = null;
    compileCount = 0;
    for (const resolve of pendingCompiles.values())
      resolve({ kind: 'internal-error', message: 'compile.worker を作り直した' });
    pendingCompiles.clear();
  }

  function startCompileWorker(): Promise<void> {
    const worker = createCompileWorker();
    compileWorker = worker;
    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent) => {
        const m = event.data as CompileOut;
        switch (m.type) {
          case 'progress':
            if (status === 'downloading')
              setStatus('downloading', m.total > 0 ? m.loaded / m.total : 0);
            break;
          case 'ready':
            resolve();
            break;
          case 'init-failed':
            reject(new Error(m.message));
            break;
          case 'compiled':
            pendingCompiles.get(m.id)?.({ kind: 'compiled', wasm: m.wasm });
            pendingCompiles.delete(m.id);
            break;
          case 'compile-error':
            pendingCompiles.get(m.id)?.({ kind: 'compile-error', diagnostics: m.diagnostics });
            pendingCompiles.delete(m.id);
            break;
          case 'internal-error':
            pendingCompiles.get(m.id)?.({ kind: 'internal-error', message: m.message });
            pendingCompiles.delete(m.id);
            break;
        }
      };
      worker.onerror = (e: ErrorEvent) => {
        const message = e.message || 'compile.worker でエラー';
        reject(new Error(message));
        for (const r of pendingCompiles.values()) r({ kind: 'internal-error', message });
        pendingCompiles.clear();
      };
      const init: CompileIn = { type: 'init', assets, sizes };
      worker.postMessage(init);
    });
  }

  function ensureReady(): Promise<void> {
    if (readyPromise) return readyPromise;
    const first = status === 'idle' || status === 'failed';
    if (first) setStatus('downloading', 0);
    readyPromise = (async () => {
      if (first) {
        await waitForServiceWorker();
        const manifest = await loadManifest();
        sizes = manifest?.teavm.sizes ?? {};
      }
      await startCompileWorker();
      setStatus('ready');
    })();
    readyPromise.catch(() => {
      dropCompileWorker();
      setStatus('failed');
    });
    return readyPromise;
  }

  type CompileRequest = Extract<CompileIn, { type: 'compile' }>;

  function compileOnce(
    files: CompileRequest,
    signal: { cancelled: boolean },
  ): Promise<CompileReply> {
    return new Promise<CompileReply>((resolve) => {
      const worker = compileWorker;
      if (!worker) {
        resolve({ kind: 'internal-error', message: 'compile.worker が無い' });
        return;
      }
      const timer = setTimeout(() => {
        pendingCompiles.delete(files.id);
        resolve({ kind: 'timeout' });
      }, compileTimeoutMs);
      pendingCompiles.set(files.id, (reply) => {
        clearTimeout(timer);
        resolve(signal.cancelled ? { kind: 'cancelled' } : reply);
      });
      worker.postMessage(files);
    });
  }

  async function compile(
    files: CompileRequest,
    signal: { cancelled: boolean },
  ): Promise<CompileReply> {
    for (let attempt = 0; attempt < 2; attempt++) {
      await ensureReady();
      if (compileCount >= recycleAfter) {
        dropCompileWorker();
        await ensureReady();
      }
      compileCount++;
      const reply = await compileOnce({ ...files, id: `${files.id}-${attempt}` }, signal);
      if (signal.cancelled) return { kind: 'cancelled' };
      if (reply.kind === 'timeout') {
        dropCompileWorker();
        return reply;
      }
      if (reply.kind !== 'internal-error' || attempt === 1) return reply;
      dropCompileWorker(); // 内部のエラーは作り直して1回だけやり直す（学習者のコードのエラーではやり直さない）
    }
    return { kind: 'internal-error', message: 'unreachable' };
  }

  function execute(
    wasm: ArrayBuffer,
    job: RunJob,
    onLive: ((c: LiveChunk) => void) | undefined,
    signal: { cancelled: boolean; stop?: () => void },
  ): Promise<RunResult> {
    return new Promise<RunResult>((resolve) => {
      const worker = createRunWorker();
      const id = `run-${++seq}`;
      let stdout = '';
      let stderr = '';
      let startedAt = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let done = false;
      const finish = (end: RawRun['end'] | 'cancelled') => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        worker.terminate();
        if (end === 'cancelled') {
          resolve({ kind: 'cancelled' });
          return;
        }
        const ms = startedAt ? now() - startedAt : 0;
        resolve(buildRunResult({ stdout, stderr, end, ms }, job.timeoutMs));
      };
      signal.stop = () => finish('cancelled');
      worker.onmessage = (event: MessageEvent) => {
        const m = event.data as RunOut;
        if (m.id !== id) return;
        switch (m.type) {
          case 'started':
            startedAt = now();
            timer = setTimeout(() => finish({ kind: 'timeout' }), job.timeoutMs);
            break;
          case 'stdout':
            stdout += m.text;
            onLive?.({ stream: 'stdout', text: m.text });
            break;
          case 'stderr':
            stderr += m.text;
            onLive?.({ stream: 'stderr', text: m.text });
            break;
          case 'exit':
            finish({ kind: 'exit', code: m.code });
            break;
          case 'limit':
            finish({ kind: 'limit' });
            break;
          case 'crash':
            finish({ kind: 'crash', crash: m.kind, message: m.message });
            break;
        }
      };
      worker.onerror = (e: ErrorEvent) =>
        finish({ kind: 'crash', crash: 'unknown', message: e.message || 'run.worker でエラー' });
      const msg: RunIn = {
        type: 'run',
        id,
        wasm,
        runtimeJs: assets.runtimeJs,
        deobfuscator: assets.deobfuscator,
      };
      worker.postMessage(msg, [wasm]);
    });
  }

  return {
    get status() {
      return status;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async prepare() {
      if (status === 'unsupported') return;
      try {
        await ensureReady();
      } catch {
        // 状態は failed になっている。画面は status で見る
      }
    },
    cancel() {
      current?.cancel();
      current = null;
    },
    async run(job, onLive) {
      // 前の実行を止める（コンパイル中のものは結果を捨てる）
      current?.cancel();
      const signal: { cancelled: boolean; stop?: () => void } = { cancelled: false };
      const mine = {
        cancel: () => {
          signal.cancelled = true;
          signal.stop?.();
        },
      };
      current = mine;
      try {
        if (status === 'unsupported') return { kind: 'unsupported' };
        if (job.source === 'compact') {
          for (const f of job.learnerFiles) {
            if (f.path !== 'Main.java') continue;
            const check = precheckCompact(f.content);
            if (!check.ok) return { kind: 'precheck', message: PRECHECK_MESSAGE, line: check.line };
          }
        }
        try {
          await ensureReady();
        } catch (e) {
          return {
            kind: 'internal-error',
            message: `Java の実行環境を準備できない: ${String((e as Error)?.message ?? e)}`,
          };
        }
        const assembled = assembleJob(job, options.harness);
        const reply = await compile(
          { type: 'compile', id: `c-${++seq}`, files: assembled.files, mainClass: 'JqRun' },
          signal,
        );
        if (signal.cancelled || reply.kind === 'cancelled') return { kind: 'cancelled' };
        switch (reply.kind) {
          case 'timeout':
            return { kind: 'internal-error', message: 'コンパイルが終わらなかった（15秒）' };
          case 'internal-error':
            return { kind: 'internal-error', message: reply.message };
          case 'compile-error':
            return {
              kind: 'compile-error',
              diagnostics: mapDiagnostics(reply.diagnostics, assembled, assembled.origins),
            };
        }
        return await execute(reply.wasm, job, onLive, signal);
      } finally {
        if (current === mine) current = null;
      }
    },
  };
}
