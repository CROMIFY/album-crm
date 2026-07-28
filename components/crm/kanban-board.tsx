"use client";

import { useOptimistic, useTransition } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { KanbanColumn } from "@/components/crm/kanban-column";
import { updateDealStage } from "@/lib/actions/deals";
import { DEAL_STAGES, DEAL_STAGE_LABELS, DEAL_STAGE_DESCRIPTIONS } from "@/lib/types";
import type { AccountType, DealStage, DealWithRelations } from "@/lib/types";

const PHASES = [
  {
    name: "Generar Leads",
    span: 1,
    color: "var(--chart-2)",
    description: "Búsqueda",
  },
  {
    name: "Prospección",
    span: 4,
    color: "var(--chart-5)",
    description: "Cadencia + Contacto + Agendada + Presentación",
  },
  {
    name: "Cierre",
    span: 4,
    color: "var(--chart-3)",
    description: "Acuerdo y condiciones → Ganado, Aplazado o Perdido",
  },
];

export function KanbanBoard({ tipo, deals }: { tipo: AccountType; deals: DealWithRelations[] }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticDeals, setOptimisticStage] = useOptimistic(
    deals,
    (state, { dealId, stage }: { dealId: string; stage: DealStage }) =>
      state.map((d) => (d.id === dealId ? { ...d, stage } : d))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const stage = over.id as DealStage;
    const current = deals.find((d) => d.id === dealId);
    if (!current || current.stage === stage) return;

    startTransition(async () => {
      setOptimisticStage({ dealId, stage });
      try {
        await updateDealStage(dealId, tipo, stage);
      } catch (err) {
        toast.error("No se pudo mover el negocio", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={`min-w-0 overflow-x-auto pb-2 ${isPending ? "opacity-80" : ""}`}>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${DEAL_STAGES.length}, 16rem)`, width: "max-content" }}
        >
          {PHASES.map((phase) => (
            <div
              key={phase.name}
              style={{ gridColumn: `span ${phase.span}` }}
              className="flex flex-col gap-1 border-b pb-2"
            >
              <span className="text-lg font-semibold" style={{ color: phase.color }}>
                {phase.name}
              </span>
              <span className="text-muted-foreground text-xs">{phase.description}</span>
            </div>
          ))}
          {DEAL_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              label={DEAL_STAGE_LABELS[stage]}
              description={DEAL_STAGE_DESCRIPTIONS[stage]}
              deals={optimisticDeals.filter((d) => d.stage === stage)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
