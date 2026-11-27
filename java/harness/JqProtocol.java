/**
 * 判定の行（設計書 5-4）を、本当の標準エラーに書く。
 * 形は「改行 ＋ U+001E ＋ "@@jq " ＋ JSON 1行 ＋ 改行」。前の改行は、学習者の出力が改行で終わっていなくても
 * 判定の行が行の頭から始まるようにするため。JSON は ASCII だけにする（日本語は \\uXXXX）。
 */
final class JqProtocol {
    /** expected・actual の上限（文字数）。超えたら切って「…（省略）」を付ける */
    static final int MAX_TEXT = 20 * 1024;

    private JqProtocol() {}

    static void hello() {
        emit(new Obj().str("t", "hello").num("v", 2).str("step", JqCases.STEP).num("rev", JqCases.REV)
                .str("source", JqCases.SOURCE));
    }

    static void stage(int stage, int passed, int total) {
        emit(new Obj().str("t", "stage").num("stage", stage).num("passed", passed).num("total", total));
    }

    static void done(int passed, int total) {
        emit(new Obj().str("t", "done").str("step", JqCases.STEP).num("rev", JqCases.REV).num("passed", passed)
                .num("total", total));
    }

    static void limit() {
        emit(new Obj().str("t", "limit").str("reason", "output"));
    }

    static void emit(Obj obj) {
        java.io.PrintStream err = JqCapture.realErr();
        err.print("\n" + (char) 0x1E + "@@jq " + obj.end() + "\n");
        err.flush();
    }

    /** 長い文字列を切る。サロゲートペアの途中では切らない */
    static String cut(String s) {
        if (s == null || s.length() <= MAX_TEXT) return s;
        int end = MAX_TEXT;
        if (Character.isHighSurrogate(s.charAt(end - 1))) end--;
        return s.substring(0, end) + "…（省略）";
    }

    static String quote(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder(s.length() + 2);
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20 || c > 0x7E) {
                        String hex = Integer.toHexString(c);
                        sb.append("\\u");
                        for (int k = hex.length(); k < 4; k++) sb.append('0');
                        sb.append(hex);
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
        return sb.toString();
    }

    /** JSON のオブジェクトを1つ組み立てる（順番どおりに並べるだけの小さな道具） */
    static final class Obj {
        private final StringBuilder sb = new StringBuilder("{");

        private Obj key(String k) {
            if (sb.length() > 1) sb.append(',');
            sb.append(quote(k)).append(':');
            return this;
        }

        Obj str(String k, String v) {
            key(k).sb.append(quote(v));
            return this;
        }

        Obj num(String k, long v) {
            key(k).sb.append(v);
            return this;
        }

        Obj bool(String k, Boolean v) {
            key(k).sb.append(v == null ? "null" : v.toString());
            return this;
        }

        Obj raw(String k, String json) {
            key(k).sb.append(json);
            return this;
        }

        String end() {
            return sb.toString() + "}";
        }
    }
}
