-- album-crm — sprints del tablero de tareas: el sprint pasa a ser un dato
-- (fechas y objetivo) y cada tarea apunta, como mucho, a uno.
-- Después de 0015_task_done_at.sql.

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  goal text,
  created_at timestamptz not null default now(),
  constraint sprints_dates_check check (ends_on >= starts_on)
);

alter table public.sprints enable row level security;
create policy "authenticated full access sprints" on public.sprints
  for all to authenticated using (true) with check (true);

-- Borrar un sprint deja sus tareas sin sprint, no las borra.
alter table public.tasks
  add column sprint_id uuid references public.sprints (id) on delete set null;
create index tasks_sprint_id_idx on public.tasks (sprint_id);

-- Los dos primeros sprints del plan del 21-oct-2026.
insert into public.sprints (name, starts_on, ends_on, goal) values
  ('Sprint 1', '2026-10-27', '2026-11-07',
   'La app abierta en producción en Google Play, con la API desplegada y lo de la revisión UX 2 probado en el móvil.'),
  ('Sprint 2', '2026-11-10', '2026-11-21', null);

-- Hasta ahora el sprint 1 se marcaba con la etiqueta «Sprint 1»: sus tareas
-- pasan a apuntar al sprint. La etiqueta se queda (se puede borrar a mano).
update public.tasks t
set sprint_id = s.id
from public.sprints s
where s.name = 'Sprint 1'
  and t.id in (
    select tl.task_id
    from public.task_labels tl
    join public.labels l on l.id = tl.label_id
    where l.name = 'Sprint 1'
  );
