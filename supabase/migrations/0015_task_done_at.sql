-- album-crm — fecha de cierre de las tareas, para saber qué se cerró en cada
-- sprint (updated_at no sirve: reordenar una columna lo reescribe en todas).
--
-- La pone y la quita un trigger, así cubre todas las vías de escritura (el
-- check de la tarjeta, arrastrar a una columna de hecho y la API REST):
-- pasa a now() cuando done cambia a true y vuelve a null cuando done es false.
-- Las tareas ya completadas antes de esta migración se quedan con done_at
-- null: no se sabe cuándo se cerraron.

alter table public.tasks add column done_at timestamptz;

create function public.set_task_done_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.done then
    new.done_at := null;
  elsif tg_op = 'INSERT' or not old.done then
    new.done_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.set_task_done_at() from public, anon, authenticated;

create trigger tasks_set_done_at
  before insert or update of done on public.tasks
  for each row execute function public.set_task_done_at();
