import "server-only";
import type {
  ErrorProject,
  SentryBreadcrumb,
  SentryIssue,
  SentryIssueDetail,
  SentryIssueLevel,
  SentryIssueStatus,
  SentryStackFrame,
} from "@/lib/errors/types";

const SENTRY_API_BASE = "https://sentry.io/api/0";

function sentryHeaders(): { Authorization: string } | null {
  const token = process.env.SENTRY_API_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

function orgSlug(): string | null {
  return process.env.SENTRY_ORG_SLUG || null;
}

type RawIssue = {
  id: string;
  shortId?: string | null;
  title: string;
  culprit?: string | null;
  level: string;
  status: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink?: string | null;
  project?: { slug?: string };
  stats?: Record<string, [number, number][]>;
};

function mapIssue(raw: RawIssue, project: ErrorProject): SentryIssue {
  return {
    id: raw.id,
    shortId: raw.shortId ?? null,
    title: raw.title,
    culprit: raw.culprit ?? null,
    project,
    level: (raw.level as SentryIssueLevel) ?? "error",
    status: (raw.status as SentryIssueStatus) ?? "unresolved",
    count: Number(raw.count ?? 0),
    userCount: raw.userCount ?? 0,
    firstSeen: raw.firstSeen,
    lastSeen: raw.lastSeen,
    permalink: raw.permalink ?? null,
  };
}

// Nombres de entorno que cuentan como "producción" en Sentry para nuestros
// proyectos. No es uniforme entre apps (album-api lo etiqueta "production"/
// "prod" según DEBUG, la integración de Vercel en album-crm usa
// "vercel-production"), así que se prueban todos como filtro OR: Sentry
// ignora en silencio los valores que no existen en un proyecto dado.
const PRODUCTION_ENVIRONMENTS = ["production", "prod", "vercel-production"];

export async function fetchSentryIssues(
  projectSlug: string,
  projectLabel: ErrorProject,
  {
    status = "unresolved",
    limit = 25,
    productionOnly = false,
  }: { status?: SentryIssueStatus | "all"; limit?: number; productionOnly?: boolean } = {}
): Promise<SentryIssue[]> {
  const headers = sentryHeaders();
  const org = orgSlug();
  if (!headers || !org) return [];

  const url = new URL(`${SENTRY_API_BASE}/projects/${org}/${projectSlug}/issues/`);
  if (status !== "all") url.searchParams.set("query", `is:${status}`);
  url.searchParams.set("sort", "freq");
  url.searchParams.set("statsPeriod", "14d");
  url.searchParams.set("limit", String(limit));
  if (productionOnly) {
    for (const env of PRODUCTION_ENVIRONMENTS) url.searchParams.append("environment", env);
  }

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as RawIssue[];
    return data.map((raw) => mapIssue(raw, projectLabel));
  } catch (err) {
    console.error(`No se pudo leer issues de Sentry para ${projectLabel}:`, err);
    return [];
  }
}

type RawFrame = {
  filename?: string | null;
  module?: string | null;
  function?: string | null;
  lineNo?: number | null;
  colNo?: number | null;
  context?: [number, string][];
  inApp?: boolean;
};

type RawBreadcrumb = {
  type?: string;
  category?: string | null;
  message?: string | null;
  level?: string | null;
  timestamp?: string | null;
};

type RawEvent = {
  tags?: { key: string; value: string }[];
  entries?: { type: string; data: unknown }[];
};

// El id del issue es único a nivel de organización en Sentry, así que no
// hace falta conocer su proyecto de antemano: se resuelve a partir del slug
// que devuelve la propia respuesta, usando el mapa slug -> label del CRM.
export async function fetchSentryIssueDetail(
  issueId: string,
  projectLabelBySlug: Record<string, ErrorProject>
): Promise<SentryIssueDetail | null> {
  const headers = sentryHeaders();
  const org = orgSlug();
  if (!headers || !org) return null;

  try {
    const [issueRes, eventRes] = await Promise.all([
      fetch(`${SENTRY_API_BASE}/organizations/${org}/issues/${issueId}/?groupStatsPeriod=30d`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${SENTRY_API_BASE}/organizations/${org}/issues/${issueId}/events/latest/`, {
        headers,
        cache: "no-store",
      }),
    ]);
    if (!issueRes.ok) return null;
    const issueData = (await issueRes.json()) as RawIssue;
    const eventData = eventRes.ok ? ((await eventRes.json()) as RawEvent) : null;

    const projectLabel = projectLabelBySlug[issueData.project?.slug ?? ""] ?? "album-crm";

    const exceptionEntry = eventData?.entries?.find((e) => e.type === "exception") as
      | { data: { values?: { stacktrace?: { frames?: RawFrame[] } }[] } }
      | undefined;
    const breadcrumbEntry = eventData?.entries?.find((e) => e.type === "breadcrumbs") as
      | { data: { values?: RawBreadcrumb[] } }
      | undefined;

    const frames = exceptionEntry?.data.values?.[0]?.stacktrace?.frames ?? [];
    const stackFrames: SentryStackFrame[] = [...frames].reverse().map((f) => ({
      filename: f.filename ?? f.module ?? null,
      function: f.function ?? null,
      lineNo: f.lineNo ?? null,
      colNo: f.colNo ?? null,
      context: f.context ?? [],
      inApp: !!f.inApp,
    }));

    const breadcrumbs: SentryBreadcrumb[] = (breadcrumbEntry?.data.values ?? []).map((b) => ({
      type: b.type ?? "default",
      category: b.category ?? null,
      message: b.message ?? null,
      level: b.level ?? null,
      timestamp: b.timestamp ?? null,
    }));

    const statsSeries = issueData.stats?.["30d"] ?? [];
    const frequency = statsSeries.map(([ts, count]) => ({
      date: new Date(ts * 1000).toISOString(),
      count,
    }));

    return {
      ...mapIssue(issueData, projectLabel),
      stackFrames,
      breadcrumbs,
      tags: eventData?.tags ?? [],
      frequency,
    };
  } catch (err) {
    console.error(`No se pudo leer el detalle del issue de Sentry ${issueId}:`, err);
    return null;
  }
}
