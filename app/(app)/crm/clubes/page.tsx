import { FunnelView } from "@/components/crm/funnel-view";
import { fetchDealsByAccountType, fetchFunnelDashboard } from "@/lib/queries/crm";

export default async function ClubesPage() {
  const [deals, dashboard] = await Promise.all([
    fetchDealsByAccountType("club"),
    fetchFunnelDashboard("club"),
  ]);

  return <FunnelView tipo="club" title="Clubes" deals={deals} dashboard={dashboard} />;
}
