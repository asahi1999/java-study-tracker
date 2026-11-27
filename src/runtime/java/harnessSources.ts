// ブラウザで使うハーネスの Java のソース（java/harness と java/harness-browser）。Vite の ?raw で文字列にする
import jqCapture from '../../../java/harness/JqCapture.java?raw';
import jqProtocol from '../../../java/harness/JqProtocol.java?raw';
import jqRun from '../../../java/harness/JqRun.java?raw';
import jqText from '../../../java/harness/JqText.java?raw';
import stdinBridge from '../../../java/harness-browser/StdinBridge.java?raw';
import type { HarnessSources } from '../../domain/java/harness.ts';

export const browserHarness: HarnessSources = {
  files: [
    { path: 'JqCapture.java', content: jqCapture },
    { path: 'JqProtocol.java', content: jqProtocol },
    { path: 'JqRun.java', content: jqRun },
    { path: 'JqText.java', content: jqText },
    { path: 'StdinBridge.java', content: stdinBridge },
  ],
};
