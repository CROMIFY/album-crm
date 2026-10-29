import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, SprintRow, TaskWithRelations } from "@/lib/types";

// Calendario: solo las tareas con fecha (los hitos son tareas), los sprints y los perfiles para el filtro.
export async function fetchCalendarData() {
  const supabase = await createClient();

  const [{ data: rawTasks, error }, { data: sprints }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, task_assignees(profile:profiles(id,nombre,email,rol,created_at))")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true }),
    supabase.from("sprints").select("*").order("starts_on", { ascending: true }),
    supabase.from("profiles").select("*").order("nombre", { ascending: true }),
  ]);
  if (error) throw new Error(error.message);

  type RawTask = TaskWithRelations & { task_assignees: { profile: ProfileRow }[] };
  const tasks: TaskWithRelations[] = ((rawTasks ?? []) as unknown as RawTask[]).map((t) => ({
    ...t,
    labels: [],
    subtasks: [],
    assignees: t.task_assignees.map((ta) => ta.profile),
  }));

  return {
    tasks,
    sprints: (sprints ?? []) as SprintRow[],
    profiles: (profiles ?? []) as ProfileRow[],
  };
}
