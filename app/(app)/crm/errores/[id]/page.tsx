import { notFound } from "next/navigation";
import { ErrorDetailView } from "@/components/crm/error-detail-view";
import { getErrorDetail } from "@/lib/queries/errors";

export default async function ErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = await getErrorDetail(id);
  if (!issue) notFound();

  return <ErrorDetailView issue={issue} />;
}
