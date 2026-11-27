/** 出力の正規化と比較（設計書 5-3）。TypeScript の src/domain/java/text.ts と同じ決まり */
final class JqText {
    private JqText() {}

    /**
     * \r\n を \n に、各行の末尾の空白（半角の空白・タブなど）を消し、末尾の空行を消す。
     * それ以外（全角・半角、行頭の空白）は区別する。
     */
    static String normalize(String s) {
        if (s == null) return null;
        String[] lines = s.replace("\r\n", "\n").split("\n", -1);
        int count = lines.length;
        for (int i = 0; i < count; i++) lines[i] = stripEnd(lines[i]);
        while (count > 0 && lines[count - 1].isEmpty()) count--;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < count; i++) {
            if (i > 0) sb.append('\n');
            sb.append(lines[i]);
        }
        return sb.toString();
    }

    static boolean same(String expected, String actual) {
        return normalize(expected).equals(normalize(actual));
    }

    private static String stripEnd(String line) {
        int end = line.length();
        while (end > 0) {
            char c = line.charAt(end - 1);
            if (c == ' ' || c == '\t' || c == '\r' || c == '\f' || c == 0x0B) end--;
            else break;
        }
        return line.substring(0, end);
    }
}
