-- album-crm — Gastos: registrar la divisa original del pago cuando no es EUR.
-- `amount` sigue siendo siempre el importe en EUR (el que usan los totales);
-- `original_amount`/`currency` guardan lo realmente pagado para referencia.
-- Pegar en el SQL Editor de Supabase y ejecutar (después de 0001-0013).

alter table public.expenses
  add column currency text not null default 'EUR',
  add column original_amount numeric(12, 2);
