// Node の Worker スレッドで app.wasm を動かす（teavm-node.ts から使う）。
// teavm の読み込み用 JS は、Node では System.exit のときに process.exit を呼ぶ。
// Worker スレッドの process.exit はこのスレッドだけを終わらせるので、その前に終わりを知らせる。
import { parentPort, workerData } from 'node:worker_threads';

import type { RunOut } from '../../src/runtime/java/core/messages.ts';
import { runApp } from '../../src/runtime/java/core/run.ts';
import type { TeavmRuntimeModule } from '../../src/runtime/java/core/teavmApi.ts';

const data = workerData as { runtimeJs: string; deobfuscator: string };
const port = parentPort;
if (!port) throw new Error('Worker スレッドとして動かす');
const id = 'node';
const send = (m: RunOut) => port.postMessage(m);

port.once('message', async (wasm: ArrayBuffer) => {
  const runtime = (await import(data.runtimeJs)) as TeavmRuntimeModule;
  const realExit = process.exit.bind(process);
  try {
    const handle = await runApp(
      runtime.load,
      wasm,
      {
        started: () => send({ type: 'started', id }),
        output: (stream, text) => send({ type: stream, id, text }),
        exit: (code) => send({ type: 'exit', id, code }),
        limit: () => send({ type: 'limit', id, reason: 'output' }),
        crash: (kind, message) => send({ type: 'crash', id, kind, message }),
      },
      {
        deobfuscatorPath: data.deobfuscator,
        bindExit: (reportExit) => {
          process.exit = ((code?: number | string | null) => {
            reportExit(typeof code === 'number' ? code : 0);
            return realExit(code ?? 0);
          }) as typeof process.exit;
        },
      },
    );
    process.on('uncaughtException', (e) => handle.reportError(e));
  } catch (e) {
    send({ type: 'crash', id, kind: 'unknown', message: String(e) });
  }
});
