"use server";

import { revalidatePath } from "next/cache";
import { updateSentryIssueStatus } from "@/lib/errors/sentry";

const LIST_PATH = "/crm/errores";

export async function resolveError(issueId: string) {
  await updateSentryIssueStatus(issueId, "resolved");
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${issueId}`);
}

export async function ignoreError(issueId: string) {
  await updateSentryIssueStatus(issueId, "ignored");
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${issueId}`);
}

export async function reopenError(issueId: string) {
  await updateSentryIssueStatus(issueId, "unresolved");
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${issueId}`);
}
