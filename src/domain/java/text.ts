// 出力の正規化（設計書 5-3）。java/harness/JqText.java と同じ決まり。
// \r\n を \n に、各行の末尾の空白を消し、末尾の空行を消す。全角・半角や行頭の空白は区別する。

export function normalizeOutput(s: string): string {
  const lines = s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t\r\f\v]+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

export function sameOutput(expected: string, actual: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(actual);
}
