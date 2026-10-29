"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSchema, type GoalInput } from "@/lib/validation/goals";

function revalidateGoals() {
  revalidatePath("/objetivos");
  revalidatePath("/calendario");
}

function toRow(input: GoalInput) {
  const g = goalSchema.parse(input);
  return {
    title: g.title,
    // Con métrica, el valor sale del CRM: no se guarda uno a mano.
    current_value: g.metric ? null : g.currentValue,
    target_value: g.targetValue,
    unit: g.unit || null,
    starts_on: g.startsOn,
    due_date: g.dueDate,
    owner_ids: g.ownerIds,
    metric: g.metric,
    notes: g.notes || null,
  };
}

export async function createGoal(input: GoalInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert(toRow(input));
  if (error) throw new Error(error.message);
  revalidateGoals();
}

export async function updateGoal(id: string, input: GoalInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").update(toRow(input)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGoals();
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGoals();
}
