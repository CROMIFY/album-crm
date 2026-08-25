"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  icon,
  label,
  value,
  suffix,
  sublabel,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  sublabel: string;
  accent?: "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">{label}</span>
          <span className="text-3xl font-semibold tabular-nums">
            {value}
            {suffix}
          </span>
          <span className="text-muted-foreground text-xs">{sublabel}</span>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            accent === "warning" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
