"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEAL_STAGE_LABELS, ACCOUNT_TYPE_LABELS_PLURAL, type AccountType, type DealStage } from "@/lib/types";

export function DashboardCharts({
  tipo,
  stageCounts,
  exitStageCounts,
  cadenceProgressCounts,
}: {
  tipo: AccountType;
  stageCounts: Record<DealStage, number>;
  exitStageCounts: Record<string, number>;
  cadenceProgressCounts: Record<number, number>;
}) {
  const entidades = ACCOUNT_TYPE_LABELS_PLURAL[tipo];

  const stageData = (Object.keys(DEAL_STAGE_LABELS) as DealStage[]).map((stage) => ({
    stage: DEAL_STAGE_LABELS[stage],
    negocios: stageCounts[stage] ?? 0,
  }));

  const outcomeData = [
    { name: "Ganado", value: stageCounts.ganado ?? 0 },
    { name: "Perdido", value: stageCounts.perdido ?? 0 },
    { name: "Aplazado", value: stageCounts.aplazado ?? 0 },
  ];

  const exitData = Object.entries(exitStageCounts).map(([stage, count]) => ({
    stage: stage === "sin_etapa" ? "Sin etapa previa" : DEAL_STAGE_LABELS[stage as DealStage] ?? stage,
    negocios: count,
  }));

  const cadenceData = Object.entries(cadenceProgressCounts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([step, count]) => ({
      paso: `${step} completados`,
      negocios: count,
    }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{entidades} por etapa</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="negocios" name={entidades} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{entidades} en cadencia por paso completado</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cadenceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="paso" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="negocios" name={entidades} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Ganados, perdidos y aplazados</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {outcomeData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={["var(--chart-1)", "var(--chart-4)", "var(--chart-5)"][i]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Etapa en la que se cae del funnel</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exitData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="negocios" name={entidades} fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
