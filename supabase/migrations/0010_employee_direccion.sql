-- Dirección (CONCRETOS / DIRECCIÓN INDUSTRIAL / DIRECCIÓN COMERCIAL).
-- El área pasa a ser el texto tras el guion del centro de costo.
alter table public.employees
  add column if not exists direccion text;

create index if not exists employees_direccion_idx on public.employees (direccion);
