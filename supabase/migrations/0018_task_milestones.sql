-- album-crm — hitos en el calendario: un hito es una tarjeta normal del tablero
-- marcada como hito, con un tipo opcional. Para los hitos de varios días
-- (p. ej. 9–13 nov) la tarjeta guarda también el día de inicio; la fecha
-- límite (due_date) es el último día.
-- Después de 0017_sprint_close_task_size.sql. Solo añade columnas: no toca
-- datos ni columnas existentes.

alter table public.tasks
  add column is_milestone boolean not null default false,
  add column milestone_type text,
  add column start_date date;

alter table public.tasks
  add constraint tasks_milestone_type_check check (
    milestone_type is null
    or milestone_type in (
      'despliegue', 'tests', 'pruebas', 'tiendas',
      'seguridad', 'legal', 'comercial', 'lanzamiento'
    )
  ),
  add constraint tasks_start_date_check check (
    start_date is null or (due_date is not null and start_date <= due_date)
  );

create index tasks_due_date_idx on public.tasks (due_date) where due_date is not null;
