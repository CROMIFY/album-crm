-- album-crm — Objetivos: meta con valor actual, plazo y responsables. El estado
-- (En camino / En riesgo / Conseguido / Vencido) se calcula en la app.
-- Si `metric` está puesto, el valor actual sale de los datos del CRM y
-- `current_value` se ignora; si no, se edita a mano (null = sin dato).
-- Después de 0018_task_milestones.sql. Tabla nueva: no toca nada existente.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  current_value numeric(12, 2),
  target_value numeric(12, 2) not null check (target_value > 0),
  unit text,
  starts_on date not null default current_date,
  due_date date not null,
  owner_ids uuid[] not null default '{}',
  metric text check (metric is null or metric in ('clubes_cerrados', 'clubes_cerrados_desde_inicio', 'clubes_nuevos_pdte_firma')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_dates_check check (due_date >= starts_on)
);

alter table public.goals enable row level security;
create policy "authenticated full access goals" on public.goals
  for all to authenticated using (true) with check (true);

create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
