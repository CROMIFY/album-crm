-- album-crm — simplifica el funnel de 9 etapas a 6: Listado, Contactado,
-- Pdte Firma, Cerrado, Rechazado, Otro año. Se aplica por igual a clubes y
-- patrocinadores (comparten el mismo enum deal_stage). Mapeo acordado:
--   busqueda, cadencia                  -> listado
--   contacto, agendada, demo            -> contactado
--   negociacion                         -> pdte_firma
--   ganado                              -> cerrado
--   perdido                             -> rechazado
--   aplazado                            -> otro_anio
-- Postgres no permite borrar/renombrar valores de un enum en bloque, así que
-- se recrea el tipo (mismo patrón que 0009_deal_stage_funnel_update.sql).
-- Pegar en el SQL Editor de Supabase y ejecutar (después de 0001-0010).

alter type public.deal_stage rename to deal_stage_old;

create type public.deal_stage as enum (
  'listado',
  'contactado',
  'pdte_firma',
  'cerrado',
  'rechazado',
  'otro_anio'
);

alter table public.deals
  alter column stage drop default,
  alter column stage type public.deal_stage using (
    case stage::text
      when 'busqueda' then 'listado'
      when 'cadencia' then 'listado'
      when 'contacto' then 'contactado'
      when 'agendada' then 'contactado'
      when 'demo' then 'contactado'
      when 'negociacion' then 'pdte_firma'
      when 'ganado' then 'cerrado'
      when 'perdido' then 'rechazado'
      when 'aplazado' then 'otro_anio'
    end
  )::public.deal_stage,
  alter column stage set default 'listado';

alter table public.deal_stage_history
  alter column from_stage type public.deal_stage using (
    case from_stage::text
      when 'busqueda' then 'listado'
      when 'cadencia' then 'listado'
      when 'contacto' then 'contactado'
      when 'agendada' then 'contactado'
      when 'demo' then 'contactado'
      when 'negociacion' then 'pdte_firma'
      when 'ganado' then 'cerrado'
      when 'perdido' then 'rechazado'
      when 'aplazado' then 'otro_anio'
    end
  )::public.deal_stage,
  alter column to_stage type public.deal_stage using (
    case to_stage::text
      when 'busqueda' then 'listado'
      when 'cadencia' then 'listado'
      when 'contacto' then 'contactado'
      when 'agendada' then 'contactado'
      when 'demo' then 'contactado'
      when 'negociacion' then 'pdte_firma'
      when 'ganado' then 'cerrado'
      when 'perdido' then 'rechazado'
      when 'aplazado' then 'otro_anio'
    end
  )::public.deal_stage;

drop type public.deal_stage_old;
