-- album-crm — guardamos el email en profiles para poder enviar notificaciones
-- (asignación de tarea, recordatorios de vencimiento) sin tener que consultar
-- auth.users con el cliente admin en cada envío.

alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

alter table public.profiles alter column email set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email);
  return new;
end;
$$;
