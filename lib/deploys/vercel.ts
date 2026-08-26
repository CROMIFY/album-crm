import "server-only";
import type { DeployItem, DeployStatus } from "@/lib/deploys/types";

const VERCEL_TEAM_ID = "team_tC5ExoRN036Mh46m1wA3n0gA";

const STATE_MAP: Record<string, DeployStatus> = {
  READY: "ready",
  ERROR: "error",
  BUILDING: "building",
  INITIALIZING: "building",
  QUEUED: "queued",
  CANCELED: "canceled",
};

type VercelDeploymentsResponse = {
  deployments: {
    uid: string;
    url: string;
    state: string;
    target: string | null;
    createdAt: number;
    meta?: {
      githubCommitMessage?: string;
      githubCommitAuthorName?: string;
    };
  }[];
};

export async function fetchVercelDeployments(
  projectId: string,
  projectLabel: string,
  limit = 8
): Promise<DeployItem[]> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return [];

  const url = new URL("https://api.vercel.com/v6/deployments");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("teamId", VERCEL_TEAM_ID);
  url.searchParams.set("limit", String(limit));

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as VercelDeploymentsResponse;

    return (data.deployments ?? []).map((d) => ({
      id: d.uid,
      project: projectLabel,
      provider: "vercel" as const,
      status: STATE_MAP[d.state] ?? "queued",
      url: d.url ? `https://${d.url}` : null,
      commitMessage: d.meta?.githubCommitMessage ?? null,
      commitAuthor: d.meta?.githubCommitAuthorName ?? null,
      createdAt: new Date(d.createdAt).toISOString(),
      target: d.target,
    }));
  } catch (err) {
    console.error(`No se pudo leer deploys de Vercel para ${projectLabel}:`, err);
    return [];
  }
}
