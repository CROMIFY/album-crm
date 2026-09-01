import { DeploysDashboardView } from "@/components/crm/deploys-dashboard-view";
import { getJobsSummary, getDeployCredentialStatus } from "@/lib/queries/deploys";

export default async function DeploysPage() {
  const jobs = await getJobsSummary();
  const credentials = getDeployCredentialStatus();

  return <DeploysDashboardView jobs={jobs} credentials={credentials} />;
}
