"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bug, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ErrorProject, SentryIssue, SentryIssueLevel, SentryIssueStatus } from "@/lib/errors/types";

const LEVEL_LABELS: Record<SentryIssueLevel, string> = {
  fatal: "Fatal",
  error: "Error",
  warning: "Warning",
  info: "Info",
  debug: "Debug",
};

const LEVEL_VARIANT: Record<SentryIssueLevel, "default" | "secondary" | "destructive" | "outline"> = {
  fatal: "destructive",
  error: "destructive",
  warning: "secondary",
  info: "outline",
  debug: "outline",
};

const STATUS_LABELS: Record<SentryIssueStatus | "all", string> = {
  unresolved: "Sin resolver",
  resolved: "Resueltos",
  ignored: "Ignorados",
  all: "Todos los estados",
};

type CredentialStatus = {
  hasToken: boolean;
  hasOrg: boolean;
  missingProjects: ErrorProject[];
};

export function ErrorsView({
  issues,
  status,
  productionOnly,
  credentials,
}: {
  issues: SentryIssue[];
  status: SentryIssueStatus | "all";
  productionOnly: boolean;
  credentials: CredentialStatus;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [project, setProject] = useState("todos");

  function setStatusFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "unresolved") params.delete("status");
    else params.set("status", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setEnvironmentFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "production") params.set("environment", "production");
    else params.delete("environment");
    router.push(`${pathname}?${params.toString()}`);
  }

  const projects = [...new Set(issues.map((i) => i.project))];
  const visible = project === "todos" ? issues : issues.filter((i) => i.project === project);

  const missingCredentials = !credentials.hasToken || !credentials.hasOrg;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Errores</h1>

      {(missingCredentials || credentials.missingProjects.length > 0) && (
        <Card className="border-destructive/40">
          <CardContent className="text-muted-foreground flex flex-col gap-1 text-sm">
            {!credentials.hasToken && (
              <p>
                Falta <code className="text-foreground">SENTRY_API_TOKEN</code>: no se pueden leer los
                errores de Sentry.
              </p>
            )}
            {!credentials.hasOrg && (
              <p>
                Falta <code className="text-foreground">SENTRY_ORG_SLUG</code>: no se pueden leer los
                errores de Sentry.
              </p>
            )}
            {credentials.missingProjects.length > 0 && (
              <p>
                Falta el slug de proyecto para: {credentials.missingProjects.join(", ")}. Revisa
                <code className="text-foreground"> .env.local.example</code>.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
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

        <Select value={status} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as (SentryIssueStatus | "all")[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={productionOnly ? "production" : "all"} onValueChange={setEnvironmentFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los entornos</SelectItem>
            <SelectItem value="production">Solo producción</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sin errores que mostrar todavía (o faltan credenciales arriba).
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((issue) => (
            <li key={issue.id}>
              <Link href={`/crm/errores/${issue.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={LEVEL_VARIANT[issue.level]} className="gap-1">
                          <Bug className="h-3.5 w-3.5" />
                          {LEVEL_LABELS[issue.level]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {issue.project}
                        </Badge>
                        <span className="truncate font-medium">{issue.title}</span>
                      </div>
                      {issue.culprit && (
                        <p className="text-muted-foreground truncate text-xs">{issue.culprit}</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        Visto por última vez{" "}
                        {formatDistanceToNow(new Date(issue.lastSeen), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                      <span className="font-medium">{issue.count} eventos</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {issue.userCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
