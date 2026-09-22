-- Desglose de recargos por semana (formato real: Concepto).
alter table public.weekly_records
  add column if not exists ot_extra_diurna numeric(6,2) not null default 0,
  add column if not exists ot_extra_nocturna numeric(6,2) not null default 0,
  add column if not exists ot_dom_diurna numeric(6,2) not null default 0,
  add column if not exists ot_dom_nocturna numeric(6,2) not null default 0;

-- Nombre del jefe tal como viene en el archivo (aunque no sea usuario de la app).
alter table public.employees
  add column if not exists manager_name text;
