/**
 * 判定の入口（設計書 5-2）。JqCases の段階とケースを順に動かし、最後に done を出して終える。
 * ケースごとに StdinBridge で入力を渡し、JqEntry.run()（学習者の main）の標準出力を期待する出力と比べる。
 * 段階0は「そのまま実行」（問題の既定の入力で動かす。期待する出力を持たず、数えない）。
 */
final class JqRun {
    private JqRun() {}

    public static void main(String[] args) {
        JqCapture.install();
        JqProtocol.hello();
        runCase(0, 0, "そのまま実行", JqCases.STDIN, null);
        int passedAll = 0;
        int totalAll = 0;
        for (int stage = 1; stage <= JqCases.STAGES; stage++) {
            int passed = 0;
            int total = 0;
            for (int i = 0; i < JqCases.CASE_NAME.length; i++) {
                if (JqCases.CASE_STAGE[i] != stage) continue;
                Boolean ok = runCase(stage, i + 1, JqCases.CASE_NAME[i], JqCases.CASE_STDIN[i],
                        JqCases.CASE_EXPECTED[i]);
                if (ok == null) continue;
                total++;
                if (ok) passed++;
            }
            int[] tests = JqCases.tests(stage);
            passed += tests[0];
            total += tests[1];
            JqProtocol.stage(stage, passed, total);
            passedAll += passed;
            totalAll += total;
        }
        JqProtocol.done(passedAll, totalAll);
        System.exit(0);
    }

    /** 1件のケースを動かして判定の行を出す。期待する出力が無いケースは null（数えない） */
    private static Boolean runCase(int stage, int index, String name, String stdin, String expected) {
        StdinBridge.set(stdin);
        JqCapture.begin();
        Throwable error = null;
        try {
            JqEntry.run();
        } catch (Throwable t) {
            error = t;
        }
        String actual = JqCapture.end();
        if (error != null) printUncaught(error);
        Boolean ok = expected == null ? null : (error == null && JqText.same(expected, actual));
        JqProtocol.Obj line = new JqProtocol.Obj().str("t", "case").num("stage", stage).num("i", index)
                .str("name", name).bool("ok", ok);
        if (Boolean.FALSE.equals(ok)) line.str("expected", JqProtocol.cut(expected));
        line.str("actual", JqProtocol.cut(actual));
        line.raw("error", error == null ? "null" : errorJson(error));
        JqProtocol.emit(line);
        return ok;
    }

    /** 学習者のファイルのうち、スタックトレースで最初に出てくる行 */
    private static StackTraceElement learnerFrame(Throwable t) {
        for (StackTraceElement e : t.getStackTrace()) {
            if (isLearnerFile(e.getFileName()) && e.getLineNumber() > 0) return e;
        }
        return null;
    }

    private static boolean isLearnerFile(String fileName) {
        if (fileName == null) return false;
        for (String f : JqCases.FILES) {
            if (f.equals(fileName)) return true;
        }
        return false;
    }

    private static String errorJson(Throwable t) {
        StackTraceElement frame = learnerFrame(t);
        JqProtocol.Obj obj = new JqProtocol.Obj().str("type", t.getClass().getName());
        if (frame == null) {
            obj.raw("line", "null").raw("file", "null");
        } else {
            obj.num("line", frame.getLineNumber()).str("file", frame.getFileName());
        }
        return obj.end();
    }

    /**
     * 捕まえなかった例外を、JDK に近い形で標準エラーに出す。
     * メッセージは出さない（teavm-javac では null になり、JDK と食い違うため。02-requirements.md 8-3）。
     * 行は学習者と配ったファイルのものだけ。
     */
    private static void printUncaught(Throwable t) {
        StringBuilder sb = new StringBuilder("Exception in thread \"main\" ").append(t.getClass().getName());
        for (StackTraceElement e : t.getStackTrace()) {
            if (!isLearnerFile(e.getFileName()) || e.getLineNumber() <= 0) continue;
            sb.append("\n\tat ").append(e.getClassName()).append('.').append(e.getMethodName()).append('(')
                    .append(e.getFileName()).append(':').append(e.getLineNumber()).append(')');
        }
        System.err.println(sb);
    }
}
