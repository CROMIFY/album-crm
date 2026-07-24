"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { NewDealDialog } from "@/components/crm/new-deal-dialog";
import { DashboardCharts } from "@/components/crm/dashboard-charts";
import { HeaderPortal } from "@/components/header-portal";
import type { AccountType, DealStage, DealWithRelations } from "@/lib/types";

export function FunnelView({
  tipo,
  title,
  deals,
  dashboard,
}: {
  tipo: AccountType;
  title: string;
  deals: DealWithRelations[];
  dashboard: {
    stageCounts: Record<DealStage, number>;
    exitStageCounts: Record<string, number>;
    cadenceProgressCounts: Record<number, number>;
  };
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <HeaderPortal>
        <NewDealDialog tipo={tipo} />
      </HeaderPortal>
      <h1 className="text-lg font-semibold">{title}</h1>
      <Tabs defaultValue="tablero">
        <TabsList>
          <TabsTrigger value="tablero">Tablero</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>
        <TabsContent value="tablero">
          <KanbanBoard tipo={tipo} deals={deals} />
        </TabsContent>
        <TabsContent value="metricas">
          <DashboardCharts {...dashboard} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
