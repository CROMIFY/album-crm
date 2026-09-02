import { ErrorsView } from "@/components/crm/errors-view";
import { getErrors, getErrorCredentialStatus } from "@/lib/queries/errors";
import type { SentryIssueStatus } from "@/lib/errors/types";

const VALID_STATUSES: (SentryIssueStatus | "all")[] = ["unresolved", "resolved", "ignored", "all"];

export default async function ErroresPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; environment?: string }>;
}) {
  const sp = await searchParams;
  const status = VALID_STATUSES.includes(sp.status as SentryIssueStatus | "all")
    ? (sp.status as SentryIssueStatus | "all")
    : "unresolved";
  const productionOnly = sp.environment === "production";

  const [issues, credentials] = await Promise.all([
    getErrors(status, productionOnly),
    getErrorCredentialStatus(),
  ]);

  return (
    <ErrorsView
      issues={issues}
      status={status}
      productionOnly={productionOnly}
      credentials={credentials}
    />
  );
}
