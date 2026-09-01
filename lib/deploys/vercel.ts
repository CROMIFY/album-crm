import "server-only";
import type { BuildLogLine, DeployHistoryPage, DeployItem, DeployStatus, JobKey } from "@/lib/deploys/types";

const VERCEL_TEAM_ID = "team_tC5ExoRN036Mh46m1wA3n0gA";

const STATE_MAP: Record<string, DeployStatus> = {
  READY: "ready",
  ERROR: "error",
  BUILDING: "building",
  INITIALIZING: "building",
  QUEUED: "queued",
  CANCELED: "canceled",
};

type VercelDeploymentListItem = {
  uid: string;
  url: string;
  state: string;
  target: string | null;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  errorMessage?: string;
  meta?: {
    githubCommitMessage?: string;
    githubCommitAuthorName?: string;
    githubCommitRef?: string;
  };
};

type VercelDeploymentsResponse = {
  deployments: VercelDeploymentListItem[];
  pagination?: { next: number | null; prev: number | null };
};

function mapDeployment(d: VercelDeploymentListItem, jobKey: JobKey, projectLabel: string): DeployItem {
  return {
    id: d.uid,
    jobKey,
    project: projectLabel,
    provider: "vercel",
    status: STATE_MAP[d.state] ?? "queued",
    url: d.url ? `https://${d.url}` : null,
    commitMessage: d.meta?.githubCommitMessage ?? null,
    commitAuthor: d.meta?.githubCommitAuthorName ?? null,
    branch: d.meta?.githubCommitRef ?? null,
    target: d.target,
    createdAt: new Date(d.createdAt).toISOString(),
    startedAt: d.buildingAt ? new Date(d.buildingAt).toISOString() : null,
    finishedAt: d.ready ? new Date(d.ready).toISOString() : null,
    errorMessage: d.errorMessage ?? null,
  };
}

export async function fetchVercelDeployments(
  projectId: string,
  jobKey: JobKey,
  projectLabel: string,
  opts: { limit?: number; until?: string } = {}
): Promise<DeployHistoryPage> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return { items: [], nextCursor: null };

  const url = new URL("https://api.vercel.com/v7/deployments");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("teamId", VERCEL_TEAM_ID);
  url.searchParams.set("limit", String(opts.limit ?? 20));
  if (opts.until) url.searchParams.set("until", opts.until);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { items: [], nextCursor: null };
    const data = (await res.json()) as VercelDeploymentsResponse;

    return {
      items: (data.deployments ?? []).map((d) => mapDeployment(d, jobKey, projectLabel)),
      nextCursor: data.pagination?.next ? String(data.pagination.next) : null,
    };
  } catch (err) {
    console.error(`No se pudo leer deploys de Vercel para ${projectLabel}:`, err);
    return { items: [], nextCursor: null };
  }
}

export async function fetchVercelDeploymentDetail(
  deploymentId: string,
  jobKey: JobKey,
  projectLabel: string
): Promise<DeployItem | null> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${VERCEL_TEAM_ID}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    // GET /v13/deployments/{id} returns `id`, while the v7 list endpoint returns `uid` for the
    // same field — normalize so mapDeployment (written against the list shape) works for both.
    const data = (await res.json()) as VercelDeploymentListItem & { id?: string; readyState?: string };
    return mapDeployment(
      { ...data, uid: data.uid ?? data.id ?? deploymentId, state: data.readyState ?? data.state },
      jobKey,
      projectLabel
    );
  } catch (err) {
    console.error(`No se pudo leer el build de Vercel ${deploymentId}:`, err);
    return null;
  }
}

export async function fetchVercelDeploymentLogs(deploymentId: string): Promise<BuildLogLine[] | null> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.vercel.com/v3/deployments/${deploymentId}/events?teamId=${VERCEL_TEAM_ID}&builds=1&limit=2000`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const events = (await res.json()) as { type?: string; text?: string }[];
    return events
      .filter((e) => typeof e.text === "string")
      .map((e) => ({
        type: e.type === "stdout" || e.type === "stderr" ? e.type : "other",
        text: e.text as string,
      }));
  } catch (err) {
    console.error(`No se pudieron leer los logs de Vercel ${deploymentId}:`, err);
    return null;
  }
}

export async function triggerVercelDeployment(job: {
  vercelProjectId: string;
  label: string;
  latestDeploymentId?: string;
}): Promise<string> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("Falta VERCEL_API_TOKEN");
  if (!job.latestDeploymentId) {
    throw new Error(`No hay ningún deploy previo de ${job.label} sobre el que relanzar uno nuevo`);
  }

  const url = new URL("https://api.vercel.com/v13/deployments");
  url.searchParams.set("teamId", VERCEL_TEAM_ID);
  url.searchParams.set("skipAutoDetectionConfirmation", "1");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: job.label,
      project: job.vercelProjectId,
      target: "production",
      deploymentId: job.latestDeploymentId,
    }),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Vercel respondió ${res.status} al intentar desplegar ${job.label}`);
  }
  return body.id as string;
}
