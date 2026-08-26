import "server-only";
import type { DeployItem, DeployStatus } from "@/lib/deploys/types";

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

type RenderServicesResponse = { service: { id: string } }[];

type RenderDeploysResponse = {
  deploy: {
    id: string;
    status: string;
    createdAt: string;
    commit?: { message?: string } | null;
  };
}[];

export async function fetchRenderDeployments(
  serviceName: string,
  projectLabel: string,
  limit = 8
): Promise<DeployItem[]> {
  const key = process.env.RENDER_API_KEY;
  if (!key) return [];

  try {
    const servicesRes = await fetch(
      `https://api.render.com/v1/services?name=${encodeURIComponent(serviceName)}&limit=1`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!servicesRes.ok) return [];
    const services = (await servicesRes.json()) as RenderServicesResponse;
    const serviceId = services[0]?.service?.id;
    if (!serviceId) return [];

    const deploysRes = await fetch(
      `https://api.render.com/v1/services/${serviceId}/deploys?limit=${limit}`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!deploysRes.ok) return [];
    const deploys = (await deploysRes.json()) as RenderDeploysResponse;

    return deploys.map(({ deploy: d }) => ({
      id: d.id,
      project: projectLabel,
      provider: "render" as const,
      status: STATUS_MAP[d.status] ?? "queued",
      url: null,
      commitMessage: d.commit?.message ?? null,
      commitAuthor: null,
      createdAt: d.createdAt,
      target: null,
    }));
  } catch (err) {
    console.error(`No se pudo leer deploys de Render para ${projectLabel}:`, err);
    return [];
  }
}
