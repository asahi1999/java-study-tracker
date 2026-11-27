// 期待と実際の行ごとの差分（F-STEP-7、05-visual-design.md 7-5）。赤は使わず、違う文字に下線と淡い地
import { diffLines, type DiffSegment } from '@/domain/judge/diff';

function Segments({ segments }: { segments: DiffSegment[] | null }) {
  if (!segments) return <span className="text-well-faint">（行なし）</span>;
  if (segments.length === 0) return <span className="text-well-faint">（空の行）</span>;
  return (
    <>
      {segments.map((s, i) =>
        s.diff ? (
          <mark
            key={i}
            className="bg-torch-hi/20 text-well-ink underline decoration-torch-hi underline-offset-2"
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

type Props = {
  expected: string;
  actual: string;
  expectedLabel?: string;
  actualLabel?: string;
};

export function DiffView({
  expected,
  actual,
  expectedLabel = '期待',
  actualLabel = '実際',
}: Props) {
  const lines = diffLines(expected, actual).slice(0, 40);
  return (
    <div className="on-well overflow-x-auto bg-well p-3 font-mono text-code text-well-ink">
      <table className="border-collapse">
        <tbody>
          {lines.map((l) =>
            l.same ? (
              <tr key={l.line}>
                <th
                  scope="row"
                  className="pr-3 text-left align-top text-xs font-normal text-well-faint"
                >
                  {l.line}
                </th>
                <td className="pr-3 text-xs text-well-faint">同じ</td>
                <td className="whitespace-pre text-well-dim">
                  <Segments segments={l.expected} />
                </td>
              </tr>
            ) : (
              [
                <tr key={`${l.line}-e`}>
                  <th
                    scope="row"
                    rowSpan={2}
                    className="pr-3 text-left align-top text-xs font-normal text-well-faint"
                  >
                    {l.line}
                  </th>
                  <td className="pr-3 text-xs text-well-dim">{expectedLabel}</td>
                  <td className="whitespace-pre">
                    <Segments segments={l.expected} />
                  </td>
                </tr>,
                <tr key={`${l.line}-a`}>
                  <td className="pr-3 text-xs text-well-dim">{actualLabel}</td>
                  <td className="whitespace-pre">
                    <Segments segments={l.actual} />
                  </td>
                </tr>,
              ]
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
