-- album-crm — ajusta el enum deal_stage a como se usa el funnel en la
-- práctica: se fusiona 'cualificar' con 'busqueda' (una sola etapa de
-- prospección) y se añade 'aplazado' como salida distinta de 'perdido', para
-- clubes/patrocinadores que no cierran ahora pero quieren retomar la
-- siguiente temporada (hasta ahora esto se guardaba como 'perdido' con un
-- lost_reason en texto libre, p.ej. "Otro año" en la carga de Notion).
-- Postgres no permite borrar valores de un enum, así que se recrea el tipo.
-- Pegar en el SQL Editor de Supabase y ejecutar (después de 0001-0008).

update public.deals set stage = 'busqueda' where stage = 'cualificar';
update public.deal_stage_history set from_stage = 'busqueda' where from_stage = 'cualificar';
update public.deal_stage_history set to_stage = 'busqueda' where to_stage = 'cualificar';

alter type public.deal_stage rename to deal_stage_old;

create type public.deal_stage as enum (
  'busqueda',
  'cadencia',
  'contacto',
  'agendada',
  'demo',
  'negociacion',
  'ganado',
  'aplazado',
  'perdido'
);

alter table public.deals
  alter column stage drop default,
  alter column stage type public.deal_stage using stage::text::public.deal_stage,
  alter column stage set default 'busqueda';

alter table public.deal_stage_history
  alter column from_stage type public.deal_stage using from_stage::text::public.deal_stage,
  alter column to_stage type public.deal_stage using to_stage::text::public.deal_stage;

drop type public.deal_stage_old;
