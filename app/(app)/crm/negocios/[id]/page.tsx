import { notFound } from "next/navigation";
import { DealDetail } from "@/components/crm/deal-detail";
import { fetchDealDetail } from "@/lib/queries/crm";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data;
  try {
    data = await fetchDealDetail(id);
  } catch {
    notFound();
  }

  if (!data.deal) notFound();

  return <DealDetail deal={data.deal} history={data.history} cadence={data.cadence} />;
}
