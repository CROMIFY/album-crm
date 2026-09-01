"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeployStatusBadge, isInProgress } from "@/components/crm/deploy-status";
import { formatBuildDuration } from "@/lib/deploys/format";
import type { BuildDetail, JobKey } from "@/lib/deploys/types";

const POLL_INTERVAL_MS = 4000;

const PROVIDER_DASHBOARD_URL: Record<"vercel" | "render", (build: BuildDetail) => string> = {
  vercel: (build) => `https://vercel.com/deployments/${build.id}`,
  render: () => "https://dashboard.render.com/",
};

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, HH:mm:ss", { locale: es });
}

export function BuildDetailView({
  jobKey,
  jobLabel,
  build: initialBuild,
}: {
  jobKey: JobKey;
  jobLabel: string;
  build: BuildDetail;
}) {
  const [build, setBuild] = useState(initialBuild);

  useEffect(() => {
    if (!isInProgress(build.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/crm/deploys/${jobKey}/${build.id}/poll`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { build: BuildDetail };
        setBuild(data.build);
      } catch {
        // Se reintenta en el siguiente tick.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [jobKey, build.id, build.status]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/crm/deploys/${jobKey}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="truncate font-mono text-lg font-semibold">{build.id}</h1>
        <DeployStatusBadge status={build.status} />
        {build.url && (
          <a
            href={build.url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Proyecto</p>
            <p>{jobLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Rama / target</p>
            <p>{build.branch ?? build.target ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Duración</p>
            <p>{formatBuildDuration(build.startedAt, build.finishedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Iniciado</p>
            <p>{formatTimestamp(build.startedAt ?? build.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Finalizado</p>
            <p>{formatTimestamp(build.finishedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Commit</p>
            <p className="truncate">
              {build.commitMessage ?? "Sin mensaje de commit"}
              {build.commitAuthor ? ` · ${build.commitAuthor}` : ""}
            </p>
          </div>
          {build.errorMessage && (
            <div className="col-span-full">
              <p className="text-muted-foreground text-xs">Error</p>
              <p className="text-destructive">{build.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {build.logs && build.logs.length > 0 ? (
            <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
              {build.logs.map((line, i) => (
                <div
                  key={i}
                  className={line.type === "stderr" ? "text-destructive" : undefined}
                >
                  {line.text}
                </div>
              ))}
            </pre>
          ) : (
            <div className="text-muted-foreground flex flex-col gap-2 text-sm">
              <p>{build.logsUnavailableReason ?? "Logs no disponibles."}</p>
              <a
                href={PROVIDER_DASHBOARD_URL[build.provider](build)}
                target="_blank"
                rel="noreferrer"
                className="text-foreground inline-flex w-fit items-center gap-1 underline"
              >
                Ver en {build.provider === "vercel" ? "Vercel" : "Render"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
