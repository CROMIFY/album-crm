import { CheckCircle2, XCircle, Loader2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DeployStatus } from "@/lib/deploys/types";

export const STATUS_LABELS: Record<DeployStatus, string> = {
  ready: "Listo",
  error: "Error",
  building: "Desplegando",
  canceled: "Cancelado",
  queued: "En cola",
};

export const STATUS_VARIANT: Record<DeployStatus, "default" | "secondary" | "destructive" | "outline"> = {
  ready: "default",
  error: "destructive",
  building: "secondary",
  canceled: "outline",
  queued: "outline",
};

export const STATUS_ICON: Record<DeployStatus, React.ReactNode> = {
  ready: <CheckCircle2 className="h-3.5 w-3.5" />,
  error: <XCircle className="h-3.5 w-3.5" />,
  building: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  canceled: <CircleDashed className="h-3.5 w-3.5" />,
  queued: <CircleDashed className="h-3.5 w-3.5" />,
};

export function DeployStatusBadge({ status }: { status: DeployStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="gap-1">
      {STATUS_ICON[status]}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function isInProgress(status: DeployStatus): boolean {
  return status === "building" || status === "queued";
}
