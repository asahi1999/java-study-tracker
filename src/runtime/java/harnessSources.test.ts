import { describe, expect, it } from 'vitest';

import { browserHarness } from './harnessSources.ts';

// java/harness/*.java を足したら harnessSources.ts の ?raw の import にも足す
const harnessFiles = Object.keys(import.meta.glob('../../../java/harness/*.java')).map((p) =>
  p.slice(p.lastIndexOf('/') + 1),
);

describe('browserHarness', () => {
  it('java/harness の全ファイルと、ブラウザ版の StdinBridge を持つ', () => {
    expect(browserHarness.files.map((f) => f.path).sort()).toEqual(
      [...harnessFiles, 'StdinBridge.java'].sort(),
    );
    for (const f of browserHarness.files) expect(f.content).toContain('final class');
    const bridge = browserHarness.files.find((f) => f.path === 'StdinBridge.java');
    expect(bridge?.content).not.toContain('System.setIn('); // teavm-javac には無い
  });
});
