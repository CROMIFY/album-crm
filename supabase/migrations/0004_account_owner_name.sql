-- album-crm — campo informativo "responsable" en la cuenta (texto libre por
-- ahora: Lander/Pablo/Jaime no tienen todavía usuario propio en la app; cuando
-- lo tengan se podrá migrar a un assignee_id real).

alter table public.accounts add column owner_name text;
