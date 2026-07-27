"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateOwnProfileName(nombre: string) {
  const trimmed = nombre.trim();
  if (!trimmed) throw new Error("El nombre no puede estar vacío");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("profiles").update({ nombre: trimmed }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
