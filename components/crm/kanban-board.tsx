"use client";

import { useOptimistic, useTransition } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { KanbanColumn } from "@/components/crm/kanban-column";
import { updateDealStage } from "@/lib/actions/deals";
import { useBoardSensors, useTouchAwareCollision } from "@/lib/dnd/sensors";
import { DEAL_STAGES, DEAL_STAGE_LABELS, DEAL_STAGE_DESCRIPTIONS, ACCOUNT_TYPE_LABELS } from "@/lib/types";
import type { AccountType, DealStage, DealWithRelations } from "@/lib/types";

const PHASES = [
  {
    name: "Generar Leads",
    span: 1,
    color: "var(--chart-2)",
    description: "Listado",
  },
  {
    name: "Prospección",
    span: 1,
    color: "var(--chart-5)",
    description: "Contactado",
  },
  {
    name: "Cierre",
    span: 4,
    color: "var(--chart-3)",
    description: "Pdte Firma → Cerrado, Rechazado u Otro año",
  },
];

const STAGE_TARGETS = DEAL_STAGES.map((stage) => ({ id: stage, label: DEAL_STAGE_LABELS[stage] }));

export function KanbanBoard({
  tipo,
  deals,
  changeStage = updateDealStage,
}: {
  tipo: AccountType;
  deals: DealWithRelations[];
  /** Guarda el cambio de etapa; se sustituye solo en el banco de pruebas de Playwright (/e2e). */
  changeStage?: typeof updateDealStage;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticDeals, setOptimisticStage] = useOptimistic(
    deals,
    (state, { dealId, stage }: { dealId: string; stage: DealStage }) =>
      state.map((d) => (d.id === dealId ? { ...d, stage } : d))
  );

  const sensors = useBoardSensors();
  const { collisionDetection, rememberActivator } = useTouchAwareCollision();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    moveDeal(String(active.id), over.id as DealStage);
  }

  function moveDeal(dealId: string, stage: DealStage) {
    const current = deals.find((d) => d.id === dealId);
    if (!current || current.stage === stage) return;

    startTransition(async () => {
      setOptimisticStage({ dealId, stage });
      try {
        await changeStage(dealId, tipo, stage);
      } catch (err) {
        toast.error(`No se pudo mover el ${ACCOUNT_TYPE_LABELS[tipo]}`, {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={rememberActivator}
      onDragEnd={handleDragEnd}
    >
      <div
        data-testid="deal-board-columns"
        className={`min-w-0 snap-x snap-mandatory overflow-x-auto pb-2 md:snap-none ${isPending ? "opacity-80" : ""}`}
      >
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
              moveTargets={STAGE_TARGETS}
              onMoveDeal={moveDeal}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
