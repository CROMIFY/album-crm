"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DeployStatusBadge, isInProgress } from "@/components/crm/deploy-status";
import { formatBuildDuration } from "@/lib/deploys/format";
import type { JobSummary } from "@/lib/deploys/types";

const POLL_INTERVAL_MS = 4000;

export function DeploysDashboardView({
  jobs: initialJobs,
  credentials,
}: {
  jobs: JobSummary[];
  credentials: { vercel: boolean; render: boolean };
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const hasInProgress = jobs.some((j) => j.lastBuild && isInProgress(j.lastBuild.status));

  useEffect(() => {
    if (!hasInProgress) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/crm/deploys/poll", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs: JobSummary[] };
        setJobs(data.jobs);
      } catch {
        // Se reintenta en el siguiente tick.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasInProgress]);

  const inProgressBuilds = jobs
    .filter((j) => j.lastBuild && isInProgress(j.lastBuild.status))
    .map((j) => ({ job: j, build: j.lastBuild! }));

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

      {inProgressBuilds.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            En curso / en cola
          </h2>
          <ul className="flex flex-col gap-2">
            {inProgressBuilds.map(({ job, build }) => (
              <li key={`${job.key}-${build.id}`}>
                <Link href={`/crm/deploys/${job.key}/${build.id}`}>
                  <Card className="border-primary/30">
                    <CardContent className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Rocket className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="shrink-0 font-medium">{job.label}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {build.commitMessage ?? "Sin mensaje de commit"}
                        </span>
                      </div>
                      <DeployStatusBadge status={build.status} />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <li key={job.key}>
            <Link href={`/crm/deploys/${job.key}`}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium">{job.label}</span>
                    {job.lastBuild ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {job.lastBuild.commitMessage ?? "Sin mensaje de commit"}
                        {job.lastBuild.commitAuthor ? ` · ${job.lastBuild.commitAuthor}` : ""}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">Sin builds todavía</p>
                    )}
                  </div>
                  {job.lastBuild && (
                    <div className="ml-auto flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-muted-foreground text-xs">
                        {formatBuildDuration(job.lastBuild.startedAt, job.lastBuild.finishedAt)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(job.lastBuild.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                      <DeployStatusBadge status={job.lastBuild.status} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
