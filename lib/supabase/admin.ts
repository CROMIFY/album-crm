import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Cliente con la service role key: se salta RLS. Solo para rutas de servidor
 * de confianza sin sesión de usuario (webhooks, cron) — nunca importar desde
 * código de cliente ni desde rutas que respondan a peticiones de usuarios.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
