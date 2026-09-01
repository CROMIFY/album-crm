import { notFound } from "next/navigation";
import { JobDetailView } from "@/components/crm/job-detail-view";
import { getJob, getJobHistory } from "@/lib/queries/deploys";
import { createClient } from "@/lib/supabase/server";
import type { JobKey } from "@/lib/deploys/types";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { projectKey } = await params;
  const { cursor } = await searchParams;

  const job = getJob(projectKey);
  if (!job) notFound();

  const supabase = await createClient();
  const [history, {
    data: { user },
  }] = await Promise.all([getJobHistory(job.key as JobKey, cursor), supabase.auth.getUser()]);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
    isAdmin = profile?.rol === "admin";
  }

  return (
    <JobDetailView
      jobKey={job.key as JobKey}
      jobLabel={job.label}
      provider={job.provider}
      history={history}
      isAdmin={isAdmin}
    />
  );
}
