import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cron diario (ver vercel.json): detecta tareas con vencimiento próximo y dejar
// constancia en notification_log. El envío real por WhatsApp/email se conecta
// más adelante, cuando se elija proveedor — de momento es solo registro.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: dueTasks, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, assignee_id")
    .lte("due_date", today)
    .not("due_date", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dueTasks || dueTasks.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const startOfDay = `${today}T00:00:00.000Z`;
  const { data: alreadyLogged } = await supabase
    .from("notification_log")
    .select("payload")
    .eq("event_type", "task_due")
    .gte("created_at", startOfDay);

  const alreadyNotifiedIds = new Set(
    (alreadyLogged ?? []).map((row) => (row.payload as { task_id?: string }).task_id)
  );

  const pending = dueTasks.filter((t) => !alreadyNotifiedIds.has(t.id));
  if (pending.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const { error: insertError } = await supabase.from("notification_log").insert(
    pending.map((t) => ({
      event_type: "task_due",
      payload: { task_id: t.id, title: t.title, due_date: t.due_date, assignee_id: t.assignee_id },
    }))
  );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, notified: pending.length });
}
