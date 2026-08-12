"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Trophy, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DEAL_STAGE_LABELS, type DealStage } from "@/lib/types";

type ActivityItem = {
  id: string;
  from_stage: DealStage | null;
  to_stage: DealStage;
  changed_at: string;
  deal: { account: { nombre: string; tipo: "club" | "patrocinador" } | null } | null;
};

export function RecentActivityCard({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
        <CardDescription>Últimos cambios de etapa</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no hay cambios de etapa registrados.</p>
        ) : (
          <ul className="flex flex-col">
            {activity.map((item, i) => {
              const account = item.deal?.account;
              const isWon = item.to_stage === "cerrado";
              const isLost = item.to_stage === "rechazado";
              return (
                <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < activity.length - 1 && (
                    <span className="bg-border absolute top-7 left-3.5 h-full w-px" />
                  )}
                  <div
                    className={cn(
                      "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                      isWon && "border-[var(--chart-1)] text-[var(--chart-1)]",
                      isLost && "border-destructive text-destructive",
                      !isWon && !isLost && "text-muted-foreground"
                    )}
                  >
                    {isWon ? (
                      <Trophy className="h-3.5 w-3.5" />
                    ) : isLost ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{account?.nombre ?? "Cuenta eliminada"}</span>
                      {account && (
                        <Badge variant="outline" className="capitalize">
                          {account.tipo}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {item.from_stage && (
                        <>
                          <Badge variant="secondary">{DEAL_STAGE_LABELS[item.from_stage]}</Badge>
                          <span className="text-muted-foreground">→</span>
                        </>
                      )}
                      <Badge variant="secondary">{DEAL_STAGE_LABELS[item.to_stage]}</Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(item.changed_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
