// RunJob から、コンパイルするファイル一式を作る（ブラウザと content-verify で同じもの。設計書 5-5）

import {
  type Assembled,
  assembleSources,
  type HarnessSources,
} from '../../../domain/java/harness.ts';
import type { RunJob } from '../JavaRunner.ts';
import type { FileOrigins } from './result.ts';

export type AssembledJob = Assembled & { origins: FileOrigins };

export function assembleJob(job: RunJob, harness: HarnessSources): AssembledJob {
  const tests =
    job.testsJava === null ? [] : [{ path: 'JqProblemTests.java', content: job.testsJava }];
  const assembled = assembleSources({
    source: job.source,
    learnerFiles: job.learnerFiles,
    givenFiles: [...job.givenFiles, ...tests],
    harness,
    cases: {
      step: job.stepId,
      rev: job.rev,
      source: job.source,
      stdin: job.stdin,
      learnerFileNames: [...job.learnerFiles, ...job.givenFiles].map((f) => f.path),
      stages: job.stages,
    },
  });
  const origins: FileOrigins = {};
  for (const f of job.learnerFiles) origins[f.path] = 'learner';
  for (const f of job.givenFiles) origins[f.path] = 'given';
  for (const f of tests) origins[f.path] = 'tests';
  return { ...assembled, origins };
}
