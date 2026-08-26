import "server-only";
import { fetchVercelDeployments } from "@/lib/deploys/vercel";
import { fetchRenderDeployments } from "@/lib/deploys/render";
import type { DeployItem } from "@/lib/deploys/types";

const VERCEL_PROJECTS = [
  { id: "prj_rgOqBZzrQuOe5wA5r3j9pFCRhLTo", label: "album-crm" },
  { id: "prj_fjxXgkKEgtivxR0ODlfDd3YiMa8n", label: "album-landing-page" },
];

const RENDER_SERVICE_NAME = "cromify-api";
const RENDER_PROJECT_LABEL = "album-api";

export async function getDeploys(): Promise<DeployItem[]> {
  const [vercelResults, renderResults] = await Promise.all([
    Promise.all(VERCEL_PROJECTS.map((p) => fetchVercelDeployments(p.id, p.label))),
    fetchRenderDeployments(RENDER_SERVICE_NAME, RENDER_PROJECT_LABEL),
  ]);

  return [...vercelResults.flat(), ...renderResults].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getDeployCredentialStatus() {
  return {
    vercel: !!process.env.VERCEL_API_TOKEN,
    render: !!process.env.RENDER_API_KEY,
  };
}
