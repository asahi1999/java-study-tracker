import { Card } from '@/components/ui/Card';
import { ROADMAP_RULES } from '@/data/initialRoadmap';

/** 進め方のルール。迷ったときに読み返せるよう、ダッシュボードの最後に置く */
export function RoadmapRules() {
  return (
    <Card title="進め方のルール">
      <ul className="grid list-disc gap-1.5 pl-5 text-sm leading-relaxed marker:text-muted">
        {ROADMAP_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </Card>
  );
}
