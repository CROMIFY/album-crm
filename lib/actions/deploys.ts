"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getJob, getJobHistory } from "@/lib/queries/deploys";
import { triggerVercelDeployment } from "@/lib/deploys/vercel";
import { triggerRenderDeployment } from "@/lib/deploys/render";

export async function triggerDeploy(jobKey: string): Promise<{ deployId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  if (profile?.rol !== "admin") {
    throw new Error("Solo un administrador puede lanzar un despliegue");
  }

  const job = getJob(jobKey);
  if (!job) throw new Error("Proyecto de despliegue desconocido");

  const deployId =
    job.provider === "vercel"
      ? await triggerVercelDeployment({
          vercelProjectId: job.vercelProjectId,
          label: job.label,
          latestDeploymentId: (await getJobHistory(job.key)).items[0]?.id,
        })
      : await triggerRenderDeployment(job.renderServiceName);

  revalidatePath(`/crm/deploys/${job.key}`);
  revalidatePath("/crm/deploys");

  return { deployId };
}
