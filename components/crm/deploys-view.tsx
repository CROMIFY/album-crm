"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink, CheckCircle2, XCircle, Loader2, CircleDashed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeployItem, DeployStatus } from "@/lib/deploys/types";

const STATUS_LABELS: Record<DeployStatus, string> = {
  ready: "Listo",
  error: "Error",
  building: "Desplegando",
  canceled: "Cancelado",
  queued: "En cola",
};

const STATUS_VARIANT: Record<DeployStatus, "default" | "secondary" | "destructive" | "outline"> = {
  ready: "default",
  error: "destructive",
  building: "secondary",
  canceled: "outline",
  queued: "outline",
};

const STATUS_ICON: Record<DeployStatus, React.ReactNode> = {
  ready: <CheckCircle2 className="h-3.5 w-3.5" />,
  error: <XCircle className="h-3.5 w-3.5" />,
  building: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  canceled: <CircleDashed className="h-3.5 w-3.5" />,
  queued: <CircleDashed className="h-3.5 w-3.5" />,
};

export function DeploysView({
  deploys,
  credentials,
}: {
  deploys: DeployItem[];
  credentials: { vercel: boolean; render: boolean };
}) {
  const [project, setProject] = useState("todos");
  const projects = [...new Set(deploys.map((d) => d.project))];
  const visible = project === "todos" ? deploys : deploys.filter((d) => d.project === project);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Deploys</h1>

      {(!credentials.vercel || !credentials.render) && (
        <Card className="border-destructive/40">
          <CardContent className="text-muted-foreground flex flex-col gap-1 text-sm">
            {!credentials.vercel && (
              <p>
                Falta <code className="text-foreground">VERCEL_API_TOKEN</code>: no se pueden leer los
                deploys de album-crm ni album-landing-page.
              </p>
            )}
            {!credentials.render && (
              <p>
                Falta <code className="text-foreground">RENDER_API_KEY</code>: no se pueden leer los
                deploys de album-api.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {projects.length > 0 && (
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sin deploys que mostrar todavía (o faltan credenciales arriba).
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((deploy) => (
            <li key={`${deploy.provider}-${deploy.id}`}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{deploy.project}</span>
                      {deploy.target && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {deploy.target}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {deploy.commitMessage ?? "Sin mensaje de commit"}
                      {deploy.commitAuthor ? ` · ${deploy.commitAuthor}` : ""}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(deploy.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={STATUS_VARIANT[deploy.status]} className="gap-1">
                      {STATUS_ICON[deploy.status]}
                      {STATUS_LABELS[deploy.status]}
                    </Badge>
                    {deploy.url && (
                      <a
                        href={deploy.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
