import "server-only";
import type { BuildLogLine, DeployHistoryPage, DeployItem, DeployStatus, JobKey } from "@/lib/deploys/types";

const STATUS_MAP: Record<string, DeployStatus> = {
  live: "ready",
  build_failed: "error",
  update_failed: "error",
  deactivated: "error",
  canceled: "canceled",
  created: "queued",
  build_in_progress: "building",
  update_in_progress: "building",
  pre_deploy_in_progress: "building",
};

type RenderServicesResponse = { service: { id: string; branch?: string } }[];

type RenderDeploy = {
  id: string;
  status: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  commit?: { message?: string } | null;
};

type RenderDeploysResponse = { deploy: RenderDeploy; cursor: string }[];

function mapDeploy(d: RenderDeploy, jobKey: JobKey, projectLabel: string): DeployItem {
  return {
    id: d.id,
    jobKey,
    project: projectLabel,
    provider: "render",
    status: STATUS_MAP[d.status] ?? "queued",
    url: null,
    commitMessage: d.commit?.message ?? null,
    commitAuthor: null,
    branch: null,
    target: null,
    createdAt: d.createdAt,
    startedAt: d.startedAt ?? null,
    finishedAt: d.finishedAt ?? null,
    errorMessage: STATUS_MAP[d.status] === "error" ? "El despliegue falló en Render" : null,
  };
}

export async function resolveRenderServiceId(serviceName: string): Promise<string | null> {
  const key = process.env.RENDER_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.render.com/v1/services?name=${encodeURIComponent(serviceName)}&limit=1`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const services = (await res.json()) as RenderServicesResponse;
    return services[0]?.service?.id ?? null;
  } catch (err) {
    console.error(`No se pudo resolver el servicio de Render ${serviceName}:`, err);
    return null;
  }
}

let cachedRenderOwnerId: string | null = null;

async function resolveRenderOwnerId(): Promise<string | null> {
  if (cachedRenderOwnerId) return cachedRenderOwnerId;
  const key = process.env.RENDER_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.render.com/v1/owners", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const owners = (await res.json()) as { owner: { id: string } }[];
    cachedRenderOwnerId = owners[0]?.owner?.id ?? null;
    return cachedRenderOwnerId;
  } catch (err) {
    console.error("No se pudo resolver el owner de Render:", err);
    return null;
  }
}

export async function fetchRenderDeployments(
  serviceName: string,
  jobKey: JobKey,
  projectLabel: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<DeployHistoryPage> {
  const key = process.env.RENDER_API_KEY;
  if (!key) return { items: [], nextCursor: null };

  try {
    const serviceId = await resolveRenderServiceId(serviceName);
    if (!serviceId) return { items: [], nextCursor: null };

    const url = new URL(`https://api.render.com/v1/services/${serviceId}/deploys`);
    url.searchParams.set("limit", String(opts.limit ?? 20));
    if (opts.cursor) url.searchParams.set("cursor", opts.cursor);

    const deploysRes = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!deploysRes.ok) return { items: [], nextCursor: null };
    const deploys = (await deploysRes.json()) as RenderDeploysResponse;

    return {
      items: deploys.map(({ deploy }) => mapDeploy(deploy, jobKey, projectLabel)),
      nextCursor: deploys.length > 0 ? deploys[deploys.length - 1].cursor : null,
    };
  } catch (err) {
    console.error(`No se pudo leer deploys de Render para ${projectLabel}:`, err);
    return { items: [], nextCursor: null };
  }
}

export async function fetchRenderDeploymentDetail(
  serviceId: string,
  deployId: string,
  jobKey: JobKey,
  projectLabel: string
): Promise<DeployItem | null> {
  const key = process.env.RENDER_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys/${deployId}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const deploy = (await res.json()) as RenderDeploy;
    return mapDeploy(deploy, jobKey, projectLabel);
  } catch (err) {
    console.error(`No se pudo leer el build de Render ${deployId}:`, err);
    return null;
  }
}

const ANSI_PATTERN = /\x1b(?:\[[0-9;]*[a-zA-Z]|\([A-Za-z0-9])/g;

export async function fetchRenderDeploymentLogs(
  serviceId: string,
  deploy: DeployItem
): Promise<BuildLogLine[] | null> {
  const key = process.env.RENDER_API_KEY;
  if (!key || !deploy.startedAt) return null;

  const ownerId = await resolveRenderOwnerId();
  if (!ownerId) return null;

  try {
    const url = new URL("https://api.render.com/v1/logs");
    url.searchParams.set("ownerId", ownerId);
    url.searchParams.append("resource", serviceId);
    url.searchParams.set("startTime", deploy.startedAt);
    url.searchParams.set("endTime", deploy.finishedAt ?? new Date().toISOString());
    url.searchParams.set("direction", "forward");
    url.searchParams.set("limit", "1000");

    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { logs?: { message: string }[] };
    if (!data.logs || data.logs.length === 0) return null;

    return data.logs.map((line) => ({
      type: "other" as const,
      text: line.message.replace(ANSI_PATTERN, ""),
    }));
  } catch (err) {
    console.error(`No se pudieron leer los logs de Render para ${serviceId}:`, err);
    return null;
  }
}

export async function triggerRenderDeployment(serviceName: string): Promise<string> {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("Falta RENDER_API_KEY");

  const serviceId = await resolveRenderServiceId(serviceName);
  if (!serviceId) throw new Error(`No se encontró el servicio de Render "${serviceName}"`);

  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message ?? `Render respondió ${res.status} al intentar desplegar ${serviceName}`);
  }
  return body.id as string;
}
