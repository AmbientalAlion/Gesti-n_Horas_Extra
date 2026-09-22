-- Dimensiones adicionales del archivo real: centro de costo y planta/sede.
alter table public.employees
  add column if not exists cost_center text,
  add column if not exists plant text;

create index if not exists employees_cost_center_idx on public.employees (cost_center);
create index if not exists employees_plant_idx on public.employees (plant);
