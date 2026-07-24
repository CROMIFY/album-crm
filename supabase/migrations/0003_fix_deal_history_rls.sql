-- album-crm — corrige el error "new row violates row-level security policy
-- for table deal_stage_history" al crear un negocio: el trigger que registra
-- el historial de etapas necesita saltarse el RLS del usuario que dispara el
-- insert/update, no solo tener permiso de select.
-- Pegar en el SQL Editor de Supabase y ejecutar (después de 0001 y 0002).

alter function public.handle_deal_insert() security definer set search_path = public;
alter function public.handle_deal_stage_change() security definer set search_path = public;
