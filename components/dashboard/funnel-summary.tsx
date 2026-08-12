"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DEAL_STAGE_LABELS, type DealStage } from "@/lib/types";

const PIPELINE_STAGES: DealStage[] = ["listado", "contactado", "pdte_firma"];

export function FunnelSummary({
  title,
  description,
  stageCounts,
  colorVar,
}: {
  title: string;
  description: string;
  stageCounts: Record<DealStage, number>;
  colorVar: string;
}) {
  const max = Math.max(1, ...PIPELINE_STAGES.map((stage) => stageCounts[stage] ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const count = stageCounts[stage] ?? 0;
          return (
            <div key={stage} className="flex items-center gap-3">
              <span className="text-muted-foreground w-24 shrink-0 text-sm">
                {DEAL_STAGE_LABELS[stage]}
              </span>
              <div className="bg-muted h-6 flex-1 overflow-hidden rounded">
                <div
                  className="h-full rounded"
                  style={{ width: `${(count / max) * 100}%`, backgroundColor: colorVar }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums">{count}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
