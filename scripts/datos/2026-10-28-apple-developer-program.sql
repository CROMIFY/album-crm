-- album-crm — Gastos: el Apple Developer Program es una cuota ANUAL, no un pago único.
-- PREPARADO, NO APLICADO. Es un cambio en la BD de producción: solo con el «sí» de Lander.
--
-- Qué hace (en una transacción; si algo no cuadra, no cambia nada):
--   «Pago Apple Store» (99 €, pago único) → «Apple Developer Program», anual,
--   próxima renovación = fecha del pago registrado (starts_at) + 1 año.
-- Antes de aplicarlo, Lander confirma que starts_at es la fecha real del pago
-- (si el gasto se creó sin cambiar la fecha, starts_at es el día en que se apuntó).
-- Ver la fila: select id, name, amount, billing_cycle, starts_at, next_billing_date
--              from public.expenses where name ilike '%apple%';

do $$
declare
  n int;
begin
  select count(*) into n
  from public.expenses
  where name = 'Pago Apple Store' and amount = 99 and billing_cycle = 'unico';
  if n <> 1 then
    raise exception 'Se esperaba 1 fila «Pago Apple Store» de 99 EUR y pago único; hay %', n;
  end if;

  update public.expenses
  set name = 'Apple Developer Program',
      billing_cycle = 'anual',
      next_billing_date = (starts_at + interval '1 year')::date,
      status = 'activo'
  where name = 'Pago Apple Store' and amount = 99 and billing_cycle = 'unico';
end $$;
