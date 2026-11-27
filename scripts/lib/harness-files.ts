// ハーネスの Java のソース（java/harness と、JDK 版・ブラウザ版の StdinBridge）をファイルから読む
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { HarnessSources } from '../../src/domain/java/harness.ts';
import type { SourceFile } from '../../src/domain/java/types.ts';
import { JAVA_DIR } from './paths.ts';

function readJavaDir(dir: string): SourceFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.java'))
    .sort()
    .map((f) => ({ path: f, content: readFileSync(path.join(dir, f), 'utf8') }));
}

export function loadHarness(target: 'jdk' | 'browser', javaDir = JAVA_DIR): HarnessSources {
  return {
    files: [
      ...readJavaDir(path.join(javaDir, 'harness')),
      ...readJavaDir(path.join(javaDir, target === 'jdk' ? 'harness-jdk' : 'harness-browser')),
    ],
  };
}
