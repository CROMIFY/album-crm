import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CalendarWithGoalsHarness } from "@/components/e2e/goals-harness";
import { e2eHarnessEnabled } from "@/lib/e2e";

// Banco de pruebas de Playwright: 404 salvo con E2E_HARNESS=1 (ver lib/e2e.ts).
export const dynamic = "force-dynamic";

export default function Page() {
  if (!e2eHarnessEnabled()) notFound();
  return (
    <Suspense>
      <CalendarWithGoalsHarness />
    </Suspense>
  );
}
