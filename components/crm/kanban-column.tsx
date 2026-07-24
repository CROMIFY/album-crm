"use client";

import { useDroppable } from "@dnd-kit/core";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { DealCard } from "@/components/crm/deal-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DealStage, DealWithRelations } from "@/lib/types";

export function KanbanColumn({
  stage,
  label,
  description,
  deals,
}: {
  stage: DealStage;
  label: string;
  description: string;
  deals: DealWithRelations[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-sm font-medium">
              {label}
              <Info className="text-muted-foreground h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-56">{description}</TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground text-xs tabular-nums">{deals.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-2 transition-colors",
          isOver && "bg-accent border-accent-foreground/20"
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
