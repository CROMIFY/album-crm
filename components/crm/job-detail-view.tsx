"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeployStatusBadge } from "@/components/crm/deploy-status";
import { BuildNowDialog } from "@/components/crm/build-now-dialog";
import { formatBuildDuration } from "@/lib/deploys/format";
import type { DeployHistoryPage, JobKey } from "@/lib/deploys/types";

export function JobDetailView({
  jobKey,
  jobLabel,
  provider,
  history,
  isAdmin,
}: {
  jobKey: JobKey;
  jobLabel: string;
  provider: "vercel" | "render";
  history: DeployHistoryPage;
  isAdmin: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/deploys">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">{jobLabel}</h1>
          <Badge variant="outline" className="uppercase">
            {provider}
          </Badge>
        </div>
        {isAdmin && <BuildNowDialog jobKey={jobKey} jobLabel={jobLabel} />}
      </div>

      {history.items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground text-sm">Sin builds todavía.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Build</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Rama / target</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Cuándo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.items.map((build) => (
                  <TableRow key={build.id}>
                    <TableCell>
                      <Link
                        href={`/crm/deploys/${jobKey}/${build.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {build.id.slice(0, 12)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DeployStatusBadge status={build.status} />
                    </TableCell>
                    <TableCell className="max-w-64 truncate whitespace-normal">
                      {build.commitMessage ?? "Sin mensaje de commit"}
                      {build.commitAuthor ? ` · ${build.commitAuthor}` : ""}
                    </TableCell>
                    <TableCell>{build.branch ?? build.target ?? "—"}</TableCell>
                    <TableCell>{formatBuildDuration(build.startedAt, build.finishedAt)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(build.createdAt), { addSuffix: true, locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {history.nextCursor && (
        <Button variant="outline" size="sm" asChild className="self-start">
          <Link href={`/crm/deploys/${jobKey}?cursor=${encodeURIComponent(history.nextCursor)}`}>
            Cargar más
          </Link>
        </Button>
      )}
    </div>
  );
}
