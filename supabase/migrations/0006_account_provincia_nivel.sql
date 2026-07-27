-- album-crm — provincia (clubes y patrocinadores) y, solo para patrocinadores,
-- alcance (global/local) y nivel (1-3).

create type sponsor_scope as enum ('global', 'local');
create type sponsor_level as enum ('nivel_1', 'nivel_2', 'nivel_3');

alter table public.accounts
  add column provincia text,
  add column alcance sponsor_scope,
  add column nivel sponsor_level;

-- alcance/nivel solo tienen sentido para patrocinadores; para clubes deben
-- quedar siempre a null.
alter table public.accounts
  add constraint accounts_sponsor_fields_check
  check (tipo = 'patrocinador' or (alcance is null and nivel is null));
