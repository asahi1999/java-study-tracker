// Java の実行と判定で共有する型（画面・Worker・scripts/ のどれからも使う。DOM に依存しない）

export type SourceFile = { path: string; content: string }; // path は 'Main.java' など

export type SourceKind = 'compact' | 'class';

/** JqCases の元（設計書 4-3・5-4）。ケースの i は、全段階を通した1始まりの番号 */
export type JqCase = { name: string; stdin: string; expected: string | null };
export type JqStage = { n: number; cases: JqCase[] };
