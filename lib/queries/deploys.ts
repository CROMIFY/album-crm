import "server-only";
import {
  fetchVercelDeployments,
  fetchVercelDeploymentDetail,
  fetchVercelDeploymentLogs,
} from "@/lib/deploys/vercel";
import {
  fetchRenderDeployments,
  fetchRenderDeploymentDetail,
  fetchRenderDeploymentLogs,
  resolveRenderServiceId,
} from "@/lib/deploys/render";
import type { BuildDetail, DeployHistoryPage, JobKey, JobSummary } from "@/lib/deploys/types";

export type JobDef =
  | { key: "album-crm" | "album-landing-page"; label: string; provider: "vercel"; vercelProjectId: string }
  | { key: "album-api"; label: string; provider: "render"; renderServiceName: string };

export const JOBS: JobDef[] = [
  { key: "album-crm", label: "album-crm", provider: "vercel", vercelProjectId: "prj_rgOqBZzrQuOe5wA5r3j9pFCRhLTo" },
  {
    key: "album-landing-page",
    label: "album-landing-page",
    provider: "vercel",
    vercelProjectId: "prj_fjxXgkKEgtivxR0ODlfDd3YiMa8n",
  },
  { key: "album-api", label: "album-api", provider: "render", renderServiceName: "cromify-api" },
];

export function getJob(key: string): JobDef | undefined {
  return JOBS.find((job) => job.key === key);
}

function fetchJobHistory(job: JobDef, opts: { limit?: number; cursor?: string }): Promise<DeployHistoryPage> {
  if (job.provider === "vercel") {
    return fetchVercelDeployments(job.vercelProjectId, job.key, job.label, {
      limit: opts.limit,
      until: opts.cursor,
    });
  }
  return fetchRenderDeployments(job.renderServiceName, job.key, job.label, opts);
}

export async function getJobsSummary(): Promise<JobSummary[]> {
  const summaries = await Promise.all(
    JOBS.map(async (job) => {
      const page = await fetchJobHistory(job, { limit: 1 });
      return { key: job.key, label: job.label, provider: job.provider, lastBuild: page.items[0] ?? null };
    })
  );
  return summaries;
}

export async function getJobHistory(key: JobKey, cursor?: string): Promise<DeployHistoryPage> {
  const job = getJob(key);
  if (!job) return { items: [], nextCursor: null };
  return fetchJobHistory(job, { limit: 20, cursor });
}

export async function getBuildDetail(key: JobKey, buildId: string): Promise<BuildDetail | null> {
  const job = getJob(key);
  if (!job) return null;

  if (job.provider === "vercel") {
    const build = await fetchVercelDeploymentDetail(buildId, job.key, job.label);
    if (!build) return null;
    const logs = await fetchVercelDeploymentLogs(buildId);
    return {
      ...build,
      logs,
      logsUnavailableReason: logs ? null : "No se pudieron obtener los logs de este build desde Vercel.",
    };
  }

  const serviceId = await resolveRenderServiceId(job.renderServiceName);
  if (!serviceId) return null;
  const build = await fetchRenderDeploymentDetail(serviceId, buildId, job.key, job.label);
  if (!build) return null;
  const logs = await fetchRenderDeploymentLogs(serviceId, build);
  return {
    ...build,
    logs,
    logsUnavailableReason: logs ? null : "Los logs de este build no están disponibles todavía en Render.",
  };
}

export function getDeployCredentialStatus() {
  return {
    vercel: !!process.env.VERCEL_API_TOKEN,
    render: !!process.env.RENDER_API_KEY,
  };
}
