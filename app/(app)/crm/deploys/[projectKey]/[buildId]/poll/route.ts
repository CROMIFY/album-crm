import { NextResponse } from "next/server";
import { getBuildDetail, getJob } from "@/lib/queries/deploys";
import type { JobKey } from "@/lib/deploys/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectKey: string; buildId: string }> }
) {
  const { projectKey, buildId } = await params;
  const job = getJob(projectKey);
  if (!job) {
    return NextResponse.json({ error: "Proyecto de despliegue desconocido" }, { status: 404 });
  }

  const build = await getBuildDetail(job.key as JobKey, buildId);
  if (!build) {
    return NextResponse.json({ error: "Build no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ build });
}
