-- album-crm — módulo de Reuniones: reuniones internas del equipo (dailys,
-- weeklys, seguimiento) y reuniones agendadas con clubes/patrocinadores.
-- Pegar en el SQL Editor de Supabase y ejecutar (después de 0001..0009).

create type meeting_status as enum ('programada', 'completada', 'cancelada', 'no_show');

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  meet_link text,
  google_calendar_event_id text,
  status meeting_status not null default 'programada',
  cancel_reason text,
  linked_account_id uuid references public.accounts (id) on delete set null,
  linked_contact_id uuid references public.contacts (id) on delete set null,
  linked_deal_id uuid references public.deals (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Asistentes: internos (profile_id) o externos (contact_id). Exactamente uno
-- de los dos debe estar definido por fila.
create table public.meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint meeting_attendees_exactly_one_type check (
    (profile_id is not null)::int + (contact_id is not null)::int = 1
  )
);

-- Varias entradas de notas por reunión, con autoría y timestamp.
create table public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Checklist de próximos pasos. linked_task_id guarda la tarea del kanban
-- creada automáticamente cuando el action item tiene asignado + fecha.
create table public.meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  linked_task_id uuid references public.tasks (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tokens OAuth de Google Calendar por usuario. A diferencia del resto de
-- tablas de este módulo, NO usa la política "authenticated full access":
-- contiene refresh tokens, así que RLS restringe cada fila a su propio dueño
-- y, en la práctica, solo se lee/escribe desde Server Actions/rutas API con
-- el admin client (service role), nunca desde el cliente.
create table public.google_calendar_tokens (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  scope text not null,
  token_expiry timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.meeting_action_items enable row level security;
alter table public.google_calendar_tokens enable row level security;

create policy "authenticated full access meetings" on public.meetings for all to authenticated using (true) with check (true);
create policy "authenticated full access meeting_attendees" on public.meeting_attendees for all to authenticated using (true) with check (true);
create policy "authenticated full access meeting_notes" on public.meeting_notes for all to authenticated using (true) with check (true);
create policy "authenticated full access meeting_action_items" on public.meeting_action_items for all to authenticated using (true) with check (true);

create policy "own google_calendar_tokens" on public.google_calendar_tokens for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create trigger meetings_set_updated_at before update on public.meetings for each row execute function public.set_updated_at();
create trigger meeting_notes_set_updated_at before update on public.meeting_notes for each row execute function public.set_updated_at();
create trigger meeting_action_items_set_updated_at before update on public.meeting_action_items for each row execute function public.set_updated_at();
create trigger google_calendar_tokens_set_updated_at before update on public.google_calendar_tokens for each row execute function public.set_updated_at();

create index meetings_starts_at_idx on public.meetings (starts_at);
create index meetings_linked_account_id_idx on public.meetings (linked_account_id);
create index meeting_attendees_meeting_id_idx on public.meeting_attendees (meeting_id);
create index meeting_notes_meeting_id_idx on public.meeting_notes (meeting_id);
create index meeting_action_items_meeting_id_idx on public.meeting_action_items (meeting_id);
