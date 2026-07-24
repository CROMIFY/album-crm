-- album-crm — esquema inicial
-- Pegar este archivo completo en el SQL Editor de Supabase y ejecutar.

create extension if not exists pgcrypto;

-- ---------- enums ----------

create type account_type as enum ('club', 'patrocinador');

create type deal_stage as enum (
  'busqueda',
  'cualificar',
  'cadencia',
  'contacto',
  'agendada',
  'demo',
  'negociacion',
  'ganado',
  'perdido'
);

create type task_priority as enum ('baja', 'media', 'alta');

-- ---------- profiles (1 fila por usuario de auth.users) ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol text not null default 'comercial',
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- CRM: cuentas, contactos, negocios ----------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tipo account_type not null,
  nombre text not null,
  telefono text,
  email text,
  web text,
  external_club_id integer, -- futuro enlace al Club real en album-api, sin usar por ahora
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  nombre text not null,
  telefono text,
  email text,
  created_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  stage deal_stage not null default 'busqueda',
  stage_entered_at timestamptz not null default now(),
  lost_reason text,
  amount numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  from_stage deal_stage,
  to_stage deal_stage not null,
  changed_at timestamptz not null default now()
);

create table public.cadence_steps (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  label text not null,
  action text not null,
  done boolean not null default false,
  done_at timestamptz,
  position integer not null default 0
);

-- Cada cambio de etapa queda registrado solo, sin depender del código de la app.

-- security definer: el trigger inserta en deal_stage_history con los
-- privilegios del dueño de la función, no del usuario autenticado que hizo el
-- insert original — si no, la política RLS de deal_stage_history (que solo
-- permite select, no insert, a authenticated) bloquearía la escritura.
create function public.handle_deal_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.deal_stage_history (deal_id, from_stage, to_stage)
  values (new.id, null, new.stage);
  return new;
end;
$$;

create trigger deals_after_insert
  after insert on public.deals
  for each row execute function public.handle_deal_insert();

create function public.handle_deal_stage_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.deal_stage_history (deal_id, from_stage, to_stage)
    values (new.id, old.stage, new.stage);
    new.stage_entered_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger deals_before_update
  before update on public.deals
  for each row execute function public.handle_deal_stage_change();

-- ---------- Tablero de tareas ----------

create table public.board_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.board_columns (id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  priority task_priority not null default 'media',
  position integer not null default 0,
  linked_account_id uuid references public.accounts (id) on delete set null,
  linked_deal_id uuid references public.deals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_labels (
  task_id uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (task_id, label_id)
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position integer not null default 0
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- Notificaciones (cola/registro, sin proveedor conectado todavía) ----------

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- 'task_due' | 'github_push'
  channel text,             -- 'whatsapp' | 'email' | null (pendiente de decidir)
  target text,
  payload jsonb not null default '{}',
  status text not null default 'pending', -- pending | sent | failed
  created_at timestamptz not null default now()
);

-- ---------- Datos iniciales ----------

insert into public.board_columns (name, position) values
  ('Backlog', 0),
  ('En curso', 1),
  ('Bloqueado', 2),
  ('Hecho', 3);

insert into public.labels (name, color) values
  ('Aplicación', '#3E6FBF'),
  ('Burocracia', '#B2792E'),
  ('Ventas/Clubes', '#2F8F4E'),
  ('Patrocinios', '#C9A227'),
  ('Urgente', '#B23A2E'),
  ('Marketing', '#7A52C7');

-- ---------- RLS: cualquier usuario autenticado tiene acceso completo (v1, roles pendientes) ----------

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.deal_stage_history enable row level security;
alter table public.cadence_steps enable row level security;
alter table public.board_columns enable row level security;
alter table public.labels enable row level security;
alter table public.tasks enable row level security;
alter table public.task_labels enable row level security;
alter table public.subtasks enable row level security;
alter table public.notification_log enable row level security;

create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "authenticated update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "authenticated full access accounts" on public.accounts for all to authenticated using (true) with check (true);
create policy "authenticated full access contacts" on public.contacts for all to authenticated using (true) with check (true);
create policy "authenticated full access deals" on public.deals for all to authenticated using (true) with check (true);
create policy "authenticated read deal_stage_history" on public.deal_stage_history for select to authenticated using (true);
create policy "authenticated full access cadence_steps" on public.cadence_steps for all to authenticated using (true) with check (true);
create policy "authenticated full access board_columns" on public.board_columns for all to authenticated using (true) with check (true);
create policy "authenticated full access labels" on public.labels for all to authenticated using (true) with check (true);
create policy "authenticated full access tasks" on public.tasks for all to authenticated using (true) with check (true);
create policy "authenticated full access task_labels" on public.task_labels for all to authenticated using (true) with check (true);
create policy "authenticated full access subtasks" on public.subtasks for all to authenticated using (true) with check (true);
create policy "authenticated full access notification_log" on public.notification_log for all to authenticated using (true) with check (true);
