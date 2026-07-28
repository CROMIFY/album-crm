-- album-crm — varias personas por tarea (antes solo una), y una columna puede
-- marcarse como "de hecho": mover una tarea ahí la completa automáticamente.

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, profile_id)
);

alter table public.task_assignees enable row level security;
create policy "authenticated full access task_assignees" on public.task_assignees
  for all to authenticated using (true) with check (true);

insert into public.task_assignees (task_id, profile_id)
select id, assignee_id from public.tasks where assignee_id is not null;

alter table public.tasks drop column assignee_id;

alter table public.board_columns add column is_done_column boolean not null default false;
update public.board_columns set is_done_column = true where name = 'Done';
