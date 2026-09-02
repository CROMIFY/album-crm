"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SentryIssueDetail, SentryIssueLevel, SentryIssueStatus } from "@/lib/errors/types";

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

const STATUS_LABELS: Record<SentryIssueStatus, string> = {
  unresolved: "Sin resolver",
  resolved: "Resuelto",
  ignored: "Ignorado",
};

export function ErrorDetailView({ issue }: { issue: SentryIssueDetail }) {
  const frequencyData = issue.frequency.map((p) => ({
    date: format(new Date(p.date), "d MMM", { locale: es }),
    eventos: p.count,
  }));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <Link
        href="/crm/errores"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a errores
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={LEVEL_VARIANT[issue.level]}>{LEVEL_LABELS[issue.level]}</Badge>
            <Badge variant="outline" className="text-[10px] uppercase">
              {issue.project}
            </Badge>
            <Badge variant="secondary">{STATUS_LABELS[issue.status]}</Badge>
          </div>
          <h1 className="text-lg font-semibold break-words">{issue.title}</h1>
          {issue.culprit && <p className="text-muted-foreground text-sm">{issue.culprit}</p>}
        </div>

        {issue.permalink && (
          <Button asChild variant="outline" size="sm">
            <a href={issue.permalink} target="_blank" rel="noreferrer">
              Ver en Sentry
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Eventos</span>
            <span className="text-lg font-semibold">{issue.count}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              Usuarios afectados
            </span>
            <span className="text-lg font-semibold">{issue.userCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Primera vez</span>
            <span className="text-sm font-medium">
              {formatDistanceToNow(new Date(issue.firstSeen), { addSuffix: true, locale: es })}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Última vez</span>
            <span className="text-sm font-medium">
              {formatDistanceToNow(new Date(issue.lastSeen), { addSuffix: true, locale: es })}
            </span>
          </CardContent>
        </Card>
      </div>

      {frequencyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Frecuencia de eventos (30 días)</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequencyData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="eventos" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stacktrace">
        <TabsList>
          <TabsTrigger value="stacktrace">Stacktrace</TabsTrigger>
          <TabsTrigger value="breadcrumbs">Breadcrumbs</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="stacktrace" className="flex flex-col gap-2 pt-3">
          {issue.stackFrames.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin stacktrace disponible para este issue.</p>
          ) : (
            issue.stackFrames.map((frame, i) => (
              <Card key={i} className={frame.inApp ? "border-primary/40" : undefined}>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <p className="font-mono text-xs">
                    <span className="font-medium">{frame.function ?? "?"}</span>
                    {frame.filename && (
                      <span className="text-muted-foreground">
                        {" "}
                        en {frame.filename}
                        {frame.lineNo != null ? `:${frame.lineNo}` : ""}
                        {frame.colNo != null ? `:${frame.colNo}` : ""}
                      </span>
                    )}
                  </p>
                  {frame.context.length > 0 && (
                    <pre className="bg-muted overflow-x-auto rounded p-2 font-mono text-xs">
                      {frame.context.map(([lineNo, code]) => `${lineNo}  ${code}`).join("\n")}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="breadcrumbs" className="flex flex-col gap-2 pt-3">
          {issue.breadcrumbs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin breadcrumbs para este issue.</p>
          ) : (
            <ul className="flex flex-col">
              {issue.breadcrumbs.map((b, i) => (
                <li key={i}>
                  <div className="flex items-start gap-3 py-1.5 text-sm">
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                      {b.category ?? b.type}
                    </Badge>
                    <span className="text-muted-foreground min-w-0 flex-1 break-words">
                      {b.message ?? "—"}
                    </span>
                    {b.timestamp && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {format(new Date(b.timestamp), "HH:mm:ss")}
                      </span>
                    )}
                  </div>
                  {i < issue.breadcrumbs.length - 1 && <Separator />}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="tags" className="pt-3">
          {issue.tags.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin tags para este issue.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {issue.tags.map((tag) => (
                <Badge key={tag.key} variant="outline" className="gap-1">
                  <span className="text-muted-foreground">{tag.key}</span>
                  {tag.value}
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
