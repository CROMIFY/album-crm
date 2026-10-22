-- album-crm — fase 3 de sprints: tamaño de las tareas y cierre de sprint.
-- Después de 0016_sprints.sql.

-- Tamaño S/M/L, el mismo que usan los informes de revisión UX. Sin tamaño = null.
alter table public.tasks
  add column size text constraint tasks_size_check check (size in ('S', 'M', 'L'));

-- Lo que quedó al cerrar el sprint. Las tareas cerradas siguen apuntando al
-- sprint (con su done_at), así que la lista de lo cerrado sale de tasks; las
-- que pasaron al siguiente o al backlog solo quedan contadas aquí.
alter table public.sprints
  add column closed_at timestamptz,
  add column closed_count integer,
  add column carried_count integer;

-- Cierra un sprint en una sola transacción. Las tareas sin terminar pasan al
-- sprint p_next_sprint_id o, si es null, al backlog: sin sprint, y las que
-- esperaban en la columna «Sprint» vuelven a «Por pensar» (las de En curso,
-- Bloqueado o Por probar se quedan donde están). Devuelve cuántas se cerraron
-- y cuántas se movieron.
create function public.close_sprint(p_sprint_id uuid, p_next_sprint_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_closed integer;
  v_carried integer;
  v_backlog_column uuid;
  v_sprint_column uuid;
begin
  if p_next_sprint_id = p_sprint_id then
    raise exception 'El sprint siguiente no puede ser el mismo que se cierra';
  end if;

  perform 1 from public.sprints where id = p_sprint_id and closed_at is null for update;
  if not found then
    raise exception 'El sprint no existe o ya está cerrado';
  end if;

  if p_next_sprint_id is not null then
    perform 1 from public.sprints where id = p_next_sprint_id and closed_at is null;
    if not found then
      raise exception 'El sprint siguiente no existe o ya está cerrado';
    end if;
  end if;

  select count(*) into v_closed from public.tasks where sprint_id = p_sprint_id and done;

  if p_next_sprint_id is not null then
    update public.tasks set sprint_id = p_next_sprint_id
    where sprint_id = p_sprint_id and not done;
  else
    select id into v_backlog_column from public.board_columns where lower(trim(name)) = 'por pensar' limit 1;
    select id into v_sprint_column from public.board_columns where lower(trim(name)) = 'sprint' limit 1;
    update public.tasks
    set sprint_id = null,
        column_id = case
          when column_id = v_sprint_column and v_backlog_column is not null then v_backlog_column
          else column_id
        end
    where sprint_id = p_sprint_id and not done;
  end if;
  get diagnostics v_carried = row_count;

  update public.sprints
  set closed_at = now(), closed_count = v_closed, carried_count = v_carried
  where id = p_sprint_id;

  return jsonb_build_object('closed', v_closed, 'carried', v_carried);
end;
$$;

-- Solo el equipo con sesión (RLS de tasks y sprints ya lo limita a authenticated).
revoke execute on function public.close_sprint(uuid, uuid) from public, anon;
grant execute on function public.close_sprint(uuid, uuid) to authenticated;
