-- album-crm — historial de contactos por negocio (club o patrocinador):
-- "el día X mandamos un email y no contestó", "dijo que está en ello", etc.
-- Después de 0019_goals.sql. Tabla nueva: no toca nada existente.

create type contact_channel as enum ('email', 'llamada', 'whatsapp', 'reunion', 'otro');
create type contact_outcome as enum ('sin_respuesta', 'en_ello', 'respondio', 'interesado', 'rechazo', 'otro');

create table public.contact_log (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  contacted_on date not null default current_date,
  channel contact_channel not null default 'email',
  outcome contact_outcome not null default 'sin_respuesta',
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index contact_log_deal_idx on public.contact_log (deal_id, contacted_on desc);

alter table public.contact_log enable row level security;
create policy "authenticated full access contact_log" on public.contact_log
  for all to authenticated using (true) with check (true);
