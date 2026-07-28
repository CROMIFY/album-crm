"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { taskAssignedEmail } from "@/lib/email/templates";
import type { TaskPriority } from "@/lib/types";

const BOARD_PATH = "/tareas";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function hasPendingSubtasks(supabase: Supabase, taskId: string) {
  const { count } = await supabase
    .from("subtasks")
    .select("*", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("done", false);
  return (count ?? 0) > 0;
}

// Best-effort: un fallo enviando el email nunca debe romper la acción de
// crear/editar la tarea, solo se registra en el servidor.
async function notifyTasksAssigned(
  supabase: Supabase,
  {
    assigneeIds,
    taskTitle,
    columnId,
    priority,
    dueDate,
  }: { assigneeIds: string[]; taskTitle: string; columnId: string; priority: TaskPriority; dueDate: string | null }
) {
  if (assigneeIds.length === 0) return;
  try {
    const [{ data: assignees }, { data: column }] = await Promise.all([
      supabase.from("profiles").select("nombre,email").in("id", assigneeIds),
      supabase.from("board_columns").select("name").eq("id", columnId).single(),
    ]);
    if (!assignees || !column) return;

    await Promise.all(
      assignees.map(async (assignee) => {
        const { subject, html } = taskAssignedEmail({
          assigneeName: assignee.nombre,
          taskTitle,
          columnName: column.name,
          priority,
          dueDate,
        });
        await sendEmail({ to: assignee.email, subject, html });
      })
    );
  } catch (err) {
    console.error("No se pudo enviar el email de tarea asignada:", err);
  }
}

export async function createTask(input: {
  columnId: string;
  title: string;
  description?: string;
  assigneeIds?: string[];
  dueDate?: string;
  priority?: TaskPriority;
  linkedAccountId?: string;
  linkedDealId?: string;
  labelIds: string[];
}) {
  const supabase = await createClient();
  const assigneeIds = input.assigneeIds ?? [];

  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("column_id", input.columnId);

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      column_id: input.columnId,
      title: input.title,
      description: input.description || null,
      due_date: input.dueDate || null,
      priority: input.priority ?? "media",
      position: count ?? 0,
      linked_account_id: input.linkedAccountId || null,
      linked_deal_id: input.linkedDealId || null,
    })
    .select()
    .single();
  if (error || !task) throw new Error(error?.message ?? "No se pudo crear la tarea");

  if (input.labelIds.length > 0) {
    const { error: labelError } = await supabase
      .from("task_labels")
      .insert(input.labelIds.map((label_id) => ({ task_id: task.id, label_id })));
    if (labelError) throw new Error(labelError.message);
  }

  if (assigneeIds.length > 0) {
    const { error: assigneeError } = await supabase
      .from("task_assignees")
      .insert(assigneeIds.map((profile_id) => ({ task_id: task.id, profile_id })));
    if (assigneeError) throw new Error(assigneeError.message);

    await notifyTasksAssigned(supabase, {
      assigneeIds,
      taskTitle: task.title,
      columnId: task.column_id,
      priority: task.priority,
      dueDate: task.due_date,
    });
  }

  revalidatePath(BOARD_PATH);
  return task.id;
}

export async function updateTaskColumn(taskId: string, columnId: string) {
  const supabase = await createClient();
  const [{ count }, { data: column }] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("column_id", columnId),
    supabase.from("board_columns").select("is_done_column").eq("id", columnId).single(),
  ]);

  const updates: { column_id: string; position: number; done?: boolean } = {
    column_id: columnId,
    position: count ?? 0,
  };

  // Mover una tarea a una columna marcada como "de hecho" (p.ej. "Done") la
  // completa sola, salvo que le queden subtareas pendientes — misma regla que
  // ya aplica setTaskDone al marcar el check manualmente.
  if (column?.is_done_column && !(await hasPendingSubtasks(supabase, taskId))) {
    updates.done = true;
  }

  const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function updateTask(
  taskId: string,
  input: Partial<{
    title: string;
    description: string | null;
    assigneeIds: string[];
    dueDate: string | null;
    priority: TaskPriority;
    linkedAccountId: string | null;
    linkedDealId: string | null;
  }>
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tasks")
    .select("column_id, title, priority, due_date")
    .eq("id", taskId)
    .single();

  const { error } = await supabase
    .from("tasks")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.dueDate !== undefined && { due_date: input.dueDate }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.linkedAccountId !== undefined && { linked_account_id: input.linkedAccountId }),
      ...(input.linkedDealId !== undefined && { linked_deal_id: input.linkedDealId }),
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  if (existing && input.assigneeIds !== undefined) {
    const { data: currentRows } = await supabase
      .from("task_assignees")
      .select("profile_id")
      .eq("task_id", taskId);
    const current = new Set((currentRows ?? []).map((r) => r.profile_id));
    const next = new Set(input.assigneeIds);

    const toAdd = input.assigneeIds.filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !next.has(id));

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId)
        .in("profile_id", toRemove);
      if (removeError) throw new Error(removeError.message);
    }
    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from("task_assignees")
        .insert(toAdd.map((profile_id) => ({ task_id: taskId, profile_id })));
      if (addError) throw new Error(addError.message);

      await notifyTasksAssigned(supabase, {
        assigneeIds: toAdd,
        taskTitle: input.title ?? existing.title,
        columnId: existing.column_id,
        priority: input.priority ?? existing.priority,
        dueDate: input.dueDate !== undefined ? input.dueDate : existing.due_date,
      });
    }
  }

  revalidatePath(BOARD_PATH);
}

export async function setTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();

  if (done && (await hasPendingSubtasks(supabase, taskId))) {
    throw new Error("Completa todas las subtareas antes de marcar la tarea como hecha.");
  }

  const { error } = await supabase.from("tasks").update({ done }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function setTaskLabel(taskId: string, labelId: string, enabled: boolean) {
  const supabase = await createClient();
  if (enabled) {
    const { error } = await supabase.from("task_labels").insert({ task_id: taskId, label_id: labelId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("task_labels")
      .delete()
      .eq("task_id", taskId)
      .eq("label_id", labelId);
    if (error) throw new Error(error.message);
  }
  revalidatePath(BOARD_PATH);
}

export async function createLabel(name: string, color: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("labels").insert({ name, color });
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function updateLabel(id: string, input: { name?: string; color?: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("labels")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function deleteLabel(id: string) {
  const supabase = await createClient();
  // La FK task_labels.label_id tiene "on delete cascade": esto también quita
  // la etiqueta de todas las tareas que la usaban, sin borrar las tareas.
  const { error } = await supabase.from("labels").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function addSubtask(taskId: string, title: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("subtasks")
    .select("*", { count: "exact", head: true })
    .eq("task_id", taskId);
  const { error } = await supabase
    .from("subtasks")
    .insert({ task_id: taskId, title, position: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function toggleSubtask(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function deleteSubtask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function createColumn(name: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("board_columns")
    .select("*", { count: "exact", head: true });
  const { error } = await supabase.from("board_columns").insert({ name, position: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function renameColumn(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("board_columns").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function setColumnIsDone(id: string, isDoneColumn: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("board_columns")
    .update({ is_done_column: isDoneColumn })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function deleteColumn(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("board_columns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}
