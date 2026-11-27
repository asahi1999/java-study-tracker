// 文字列を Java の文字列リテラル（"..."）にする。
// 改行・引用符・\・タブはエスケープし、そのほかの制御文字は8進のエスケープにする。
// \uXXXX は使わない（Java は \u をソースを読む前に変換するので、\u000a が本物の改行になってしまう）。
// 日本語などはそのまま書く（ソースは UTF-8 で読む）。

export function toJavaStringLiteral(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code === 0x7f) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += ch;
  }
  return `${out}"`;
}

export function toJavaStringOrNull(s: string | null): string {
  return s === null ? 'null' : toJavaStringLiteral(s);
}
