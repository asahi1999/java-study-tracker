// 実行中の出力をまとめて送る（設計書 4-4）。teavm は1文字（UTF-16 の1単位）ずつ渡してくるので、
// ためて、行の終わり・50ms ごと・一定の量のどれかで送る（1文字ずつは送らない）。出力の上限も数える（ハーネスの JqCapture と二重の守り）。
// 判定の行（行の頭が U+001E の行）は数えない。

export const OUTPUT_MAX_CHARS = 100_000;
export const OUTPUT_MAX_LINES = 2_000;
// Worker 側の上限は少し大きくする。判定の行の前の改行も数えてしまうのと、ハーネスの limit の行を先に届けるため
export const WORKER_LIMIT_MARGIN = { chars: 10_000, lines: 500 };

export type Stream = 'stdout' | 'stderr';

export type OutputBufferOptions = {
  flushMs?: number;
  flushChars?: number;
  maxChars?: number;
  maxLines?: number;
  now?: () => number;
  onFlush: (stream: Stream, text: string) => void;
  onLimit: () => void;
};

export type OutputBuffer = {
  /** 1文字ためる。上限を超えたら false（以後は捨てる） */
  put(stream: Stream, code: number): boolean;
  flush(): void;
  readonly limited: boolean;
};

const RS = 0x1e;
const NL = 0x0a;

export function createOutputBuffer(options: OutputBufferOptions): OutputBuffer {
  const flushMs = options.flushMs ?? 50;
  const flushChars = options.flushChars ?? 8192;
  const maxChars = options.maxChars ?? OUTPUT_MAX_CHARS + WORKER_LIMIT_MARGIN.chars;
  const maxLines = options.maxLines ?? OUTPUT_MAX_LINES + WORKER_LIMIT_MARGIN.lines;
  const now = options.now ?? (() => performance.now());
  const pending: Record<Stream, number[]> = { stdout: [], stderr: [] };
  const atLineStart: Record<Stream, boolean> = { stdout: true, stderr: true };
  let inProtocolLine = false;
  let chars = 0;
  let lines = 0;
  let limited = false;
  let lastFlush = now();

  const flushStream = (stream: Stream) => {
    const codes = pending[stream];
    if (codes.length === 0) return;
    let text = '';
    for (let i = 0; i < codes.length; i += 4096) {
      text += String.fromCharCode(...codes.slice(i, i + 4096));
    }
    pending[stream] = [];
    options.onFlush(stream, text);
  };

  const flush = () => {
    flushStream('stdout');
    flushStream('stderr');
    lastFlush = now();
  };

  return {
    get limited() {
      return limited;
    },
    put(stream, code) {
      if (limited) return false;
      pending[stream].push(code);
      if (stream === 'stderr' && atLineStart.stderr && code === RS) inProtocolLine = true;
      const counted = !(stream === 'stderr' && inProtocolLine);
      if (code === NL) {
        if (stream === 'stderr') inProtocolLine = false;
        atLineStart[stream] = true;
      } else {
        atLineStart[stream] = false;
      }
      if (counted) {
        // サロゲートペアの後ろ半分は数えない（= 文字数）
        if (code < 0xdc00 || code > 0xdfff) chars++;
        if (code === NL) lines++;
        if (chars > maxChars || lines > maxLines) {
          limited = true;
          flush();
          options.onLimit();
          return false;
        }
      }
      // 行の終わりでも送る。Wasm の実行中はタイマーが動かないので、無限ループの前の出力（判定の行を含む）を
      // ためたままにしないため（行の数は上限 2,000 行なので、送る回数も限られる）
      if (code === NL || pending[stream].length >= flushChars || now() - lastFlush >= flushMs)
        flush();
      return true;
    },
    flush,
  };
}
