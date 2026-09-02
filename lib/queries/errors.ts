import "server-only";
import { fetchSentryIssueDetail, fetchSentryIssues } from "@/lib/errors/sentry";
import type { ErrorProject, SentryIssue, SentryIssueDetail, SentryIssueStatus } from "@/lib/errors/types";

const SENTRY_PROJECT_CONFIG: { slug: string | undefined; label: ErrorProject }[] = [
  { slug: process.env.SENTRY_PROJECT_CRM, label: "album-crm" },
  { slug: process.env.SENTRY_PROJECT_LANDING, label: "album-landing-page" },
  { slug: process.env.SENTRY_PROJECT_API, label: "album-api" },
  { slug: process.env.SENTRY_PROJECT_APP, label: "album-app" },
];

function configuredProjects() {
  return SENTRY_PROJECT_CONFIG.filter(
    (p): p is { slug: string; label: ErrorProject } => !!p.slug
  );
}

export async function getErrors(
  status: SentryIssueStatus | "all" = "unresolved",
  productionOnly = false
): Promise<SentryIssue[]> {
  const projects = configuredProjects();
  const results = await Promise.all(
    projects.map((p) => fetchSentryIssues(p.slug, p.label, { status, productionOnly }))
  );
  return results.flat().sort((a, b) => b.count - a.count);
}

export async function getErrorDetail(issueId: string): Promise<SentryIssueDetail | null> {
  const projectLabelBySlug = Object.fromEntries(
    configuredProjects().map((p) => [p.slug, p.label])
  );
  return fetchSentryIssueDetail(issueId, projectLabelBySlug);
}

export function getErrorCredentialStatus() {
  return {
    hasToken: !!process.env.SENTRY_API_TOKEN,
    hasOrg: !!process.env.SENTRY_ORG_SLUG,
    missingProjects: SENTRY_PROJECT_CONFIG.filter((p) => !p.slug).map((p) => p.label),
  };
}
