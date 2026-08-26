-- Fase 0 de seguridad: cierra los hallazgos de `supabase db advisors --type security`.
--
-- 1) Las funciones de trigger (SECURITY DEFINER) quedaban expuestas como RPC pública
--    en /rest/v1/rpc/<nombre>, invocables por los roles anon y authenticated aunque
--    solo están pensadas para dispararse desde CREATE TRIGGER. Revocar EXECUTE no
--    afecta a los triggers: Postgres los ejecuta con los privilegios del dueño de la
--    función, no con los del rol que hizo el INSERT/UPDATE.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_deal_insert() from public, anon, authenticated;
revoke execute on function public.handle_deal_stage_change() from public, anon, authenticated;

-- 2) search_path mutable en una función sin SECURITY DEFINER: riesgo menor, pero se
--    fija igualmente para eliminar el aviso y por higiene general.
alter function public.set_updated_at() set search_path = public;
