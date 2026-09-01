import { notFound } from "next/navigation";
import { BuildDetailView } from "@/components/crm/build-detail-view";
import { getBuildDetail, getJob } from "@/lib/queries/deploys";
import type { JobKey } from "@/lib/deploys/types";

export default async function BuildDetailPage({
  params,
}: {
  params: Promise<{ projectKey: string; buildId: string }>;
}) {
  const { projectKey, buildId } = await params;

  const job = getJob(projectKey);
  if (!job) notFound();

  const build = await getBuildDetail(job.key as JobKey, buildId);
  if (!build) notFound();

  return <BuildDetailView jobKey={job.key as JobKey} jobLabel={job.label} build={build} />;
}
