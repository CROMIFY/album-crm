-- album-crm — añade el estado "completada" a las tareas.
-- Pegar en el SQL Editor de Supabase y ejecutar (después de 0001_init.sql).

alter table public.tasks add column done boolean not null default false;
