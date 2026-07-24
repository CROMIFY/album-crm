import { createClient } from "@/lib/supabase/server";
import type {
  AccountRow,
  BoardColumnRow,
  LabelRow,
  ProfileRow,
  SubtaskRow,
  TaskWithRelations,
} from "@/lib/types";

export async function fetchBoard() {
  const supabase = await createClient();

  const [{ data: columns }, { data: rawTasks }, { data: labels }, { data: profiles }, { data: accounts }] =
    await Promise.all([
      supabase.from("board_columns").select("*").order("position", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "*, subtasks(*), assignee:profiles(id,nombre,rol,created_at), task_labels(label:labels(*))"
        )
        .order("position", { ascending: true }),
      supabase.from("labels").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("accounts").select("*"),
    ]);

  type RawTask = TaskWithRelations & {
    task_labels: { label: LabelRow }[];
    subtasks: SubtaskRow[];
  };

  const tasks: TaskWithRelations[] = ((rawTasks ?? []) as unknown as RawTask[]).map((t) => ({
    ...t,
    labels: t.task_labels.map((tl) => tl.label),
  }));

  return {
    columns: (columns ?? []) as BoardColumnRow[],
    tasks,
    labels: (labels ?? []) as LabelRow[],
    profiles: (profiles ?? []) as ProfileRow[],
    accounts: (accounts ?? []) as AccountRow[],
  };
}
