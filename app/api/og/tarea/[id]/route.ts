import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/link-preview";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Solo la ve el bot de vista previa (lo decide proxy.ts): título y estado, nada más.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let title = "Tarea";
  let status = "Cromify CRM";

  if (UUID.test(id)) {
    const { data } = await createAdminClient()
      .from("tasks")
      .select("title, done, board_columns(name)")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      title = data.title;
      const column = (data as unknown as { board_columns: { name: string } | null }).board_columns;
      status = `${data.done ? "Hecha" : (column?.name ?? "Tarea")} · Cromify CRM`;
    }
  }

  const url = new URL(request.url);
  const canonical = `${url.origin}/tareas?tarea=${id}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cromify CRM">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(status)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="description" content="${escapeHtml(status)}">
</head><body>${escapeHtml(title)}</body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, max-age=60" },
  });
}
