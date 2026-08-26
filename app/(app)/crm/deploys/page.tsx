import { DeploysView } from "@/components/crm/deploys-view";
import { getDeploys, getDeployCredentialStatus } from "@/lib/queries/deploys";

export default async function DeploysPage() {
  const deploys = await getDeploys();
  const credentials = getDeployCredentialStatus();

  return <DeploysView deploys={deploys} credentials={credentials} />;
}
