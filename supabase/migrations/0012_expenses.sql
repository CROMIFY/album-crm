-- album-crm — módulo de Gastos: suscripciones recurrentes (mensual/anual) y
-- gastos puntuales, con categorías gestionables (mismo espíritu que labels).
-- Pegar en el SQL Editor de Supabase y ejecutar (después de 0001-0011).

create type expense_billing_cycle as enum ('unico', 'mensual', 'anual');
create type expense_status as enum ('activo', 'cancelado');

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.expense_categories (id) on delete set null,
  vendor text,
  amount numeric(12, 2) not null,
  billing_cycle expense_billing_cycle not null default 'unico',
  starts_at date not null default current_date,
  next_billing_date date,
  status expense_status not null default 'activo',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.expense_categories (name, color) values
  ('Software', '#3B82F6'),
  ('Infraestructura', '#344563'),
  ('Marketing', '#7A52C7'),
  ('Legal / Burocracia', '#B2792E'),
  ('Otros', '#64748B');

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

create policy "authenticated full access expense_categories" on public.expense_categories for all to authenticated using (true) with check (true);
create policy "authenticated full access expenses" on public.expenses for all to authenticated using (true) with check (true);

create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();

create index expenses_status_idx on public.expenses (status);
create index expenses_next_billing_date_idx on public.expenses (next_billing_date);
