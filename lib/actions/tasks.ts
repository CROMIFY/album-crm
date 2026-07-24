"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority } from "@/lib/types";

const BOARD_PATH = "/tareas";

export async function createTask(input: {
  columnId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: TaskPriority;
  linkedAccountId?: string;
  linkedDealId?: string;
  labelIds: string[];
}) {
  const supabase = await createClient();

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
      assignee_id: input.assigneeId || null,
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

  revalidatePath(BOARD_PATH);
  return task.id;
}

export async function updateTaskColumn(taskId: string, columnId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("column_id", columnId);
  const { error } = await supabase
    .from("tasks")
    .update({ column_id: columnId, position: count ?? 0 })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function updateTask(
  taskId: string,
  input: Partial<{
    title: string;
    description: string | null;
    assigneeId: string | null;
    dueDate: string | null;
    priority: TaskPriority;
    linkedAccountId: string | null;
    linkedDealId: string | null;
  }>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.assigneeId !== undefined && { assignee_id: input.assigneeId }),
      ...(input.dueDate !== undefined && { due_date: input.dueDate }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.linkedAccountId !== undefined && { linked_account_id: input.linkedAccountId }),
      ...(input.linkedDealId !== undefined && { linked_deal_id: input.linkedDealId }),
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}

export async function setTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();

  if (done) {
    const { count: pendingCount } = await supabase
      .from("subtasks")
      .select("*", { count: "exact", head: true })
      .eq("task_id", taskId)
      .eq("done", false);
    if ((pendingCount ?? 0) > 0) {
      throw new Error("Completa todas las subtareas antes de marcar la tarea como hecha.");
    }
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

export async function deleteColumn(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("board_columns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(BOARD_PATH);
}
