import { FunnelView } from "@/components/crm/funnel-view";
import { fetchDealsByAccountType, fetchFunnelDashboard } from "@/lib/queries/crm";

export default async function PatrociniosPage() {
  const [deals, dashboard] = await Promise.all([
    fetchDealsByAccountType("patrocinador"),
    fetchFunnelDashboard("patrocinador"),
  ]);

  return <FunnelView tipo="patrocinador" title="Patrocinios" deals={deals} dashboard={dashboard} />;
}
