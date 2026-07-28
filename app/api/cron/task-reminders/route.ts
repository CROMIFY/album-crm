import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { taskDueReminderEmail } from "@/lib/email/templates";
import type { TaskPriority } from "@/lib/types";

// Cron diario (ver vercel.json): avisa por email de tareas sin terminar que
// vencen mañana o que vencen hoy (o ya vencieron), y deja constancia en
// notification_log para no repetir el aviso el mismo día. Cada tarea puede
// tener varias personas asignadas — se avisa a todas.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  type DueTaskRow = {
    id: string;
    title: string;
    due_date: string;
    column_id: string;
    priority: TaskPriority;
    task_assignees: { profile_id: string }[];
  };

  const { data: rawDueTasks, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, column_id, priority, task_assignees(profile_id)")
    .lte("due_date", tomorrow)
    .not("due_date", "is", null)
    .eq("done", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dueTasks = (rawDueTasks ?? []) as unknown as DueTaskRow[];
  if (dueTasks.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const withKind = dueTasks.map((task) => ({
    ...task,
    eventType: task.due_date === tomorrow ? "task_due_soon" : "task_due_today",
    when: (task.due_date === tomorrow ? "mañana" : "hoy") as "mañana" | "hoy",
  }));

  const startOfDay = `${today}T00:00:00.000Z`;
  const { data: alreadyLogged } = await supabase
    .from("notification_log")
    .select("event_type, payload")
    .in("event_type", ["task_due_soon", "task_due_today"])
    .gte("created_at", startOfDay);

  const alreadyNotifiedKeys = new Set(
    (alreadyLogged ?? []).map(
      (row) => `${row.event_type}:${(row.payload as { task_id?: string }).task_id}`
    )
  );

  const pending = withKind.filter((t) => !alreadyNotifiedKeys.has(`${t.eventType}:${t.id}`));
  if (pending.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const assigneeIds = [...new Set(pending.flatMap((t) => t.task_assignees.map((a) => a.profile_id)))];
  const columnIds = [...new Set(pending.map((t) => t.column_id))];

  const [{ data: profiles }, { data: columns }] = await Promise.all([
    assigneeIds.length
      ? supabase.from("profiles").select("id,nombre,email").in("id", assigneeIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string; email: string }[] }),
    supabase.from("board_columns").select("id,name").in("id", columnIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const columnById = new Map((columns ?? []).map((c) => [c.id, c.name]));

  let emailsSent = 0;
  for (const task of pending) {
    for (const { profile_id } of task.task_assignees) {
      const assignee = profileById.get(profile_id);
      if (!assignee) continue;

      try {
        const { subject, html } = taskDueReminderEmail({
          assigneeName: assignee.nombre,
          taskTitle: task.title,
          columnName: columnById.get(task.column_id) ?? "",
          when: task.when,
        });
        const result = await sendEmail({ to: assignee.email, subject, html });
        if (result.sent) emailsSent++;
      } catch (err) {
        console.error(`No se pudo enviar el recordatorio de la tarea ${task.id} a ${profile_id}:`, err);
      }
    }
  }

  const { error: insertError } = await supabase.from("notification_log").insert(
    pending.map((t) => ({
      event_type: t.eventType,
      payload: {
        task_id: t.id,
        title: t.title,
        due_date: t.due_date,
        assignee_ids: t.task_assignees.map((a) => a.profile_id),
      },
    }))
  );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, notified: pending.length, emailsSent });
}
