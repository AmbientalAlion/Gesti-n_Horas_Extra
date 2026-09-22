-- Esquema inicial: control de horas extras ALION
-- Roles: rrhh, director, jefe

create type public.app_role as enum ('rrhh', 'director', 'jefe');

-- Perfiles de usuario, vinculados a auth.users. El rol define los permisos.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'jefe',
  created_at timestamptz not null default now()
);

-- Empleados de planta (archivo estructural / nómina).
-- manager_id vincula cada empleado con su jefe inmediato (un profile con rol 'jefe').
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- ID biométrico del empleado
  name text,
  role_title text,                          -- cargo/rol operativo
  area text,
  manager_id uuid references public.profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employees_manager_idx on public.employees (manager_id);
create index employees_area_idx on public.employees (area);

-- Registros semanales consolidados (archivo operativo biométrico).
-- La unicidad (employee_id, year, week) habilita el upsert de cortes parciales/finales.
create table public.weekly_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  year int not null,
  week int not null check (week between 1 and 53),
  month int not null check (month between 1 and 12),
  total_hours numeric(6, 2) not null default 0,
  overtime_hours numeric(6, 2) not null default 0,
  is_partial boolean not null default false,
  has_error boolean not null default false,
  error_reason text,
  max_shift_hours numeric(6, 2),
  uploaded_at timestamptz not null default now(),
  unique (employee_id, year, week)
);

create index weekly_records_period_idx on public.weekly_records (year, month, week);
create index weekly_records_employee_idx on public.weekly_records (employee_id);

-- Auditoría de cargas de archivos.
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_name text,
  cut_type text not null default 'final' check (cut_type in ('parcial', 'final')),
  year int not null,
  week int not null,
  rows_processed int not null default 0,
  rows_with_error int not null default 0,
  created_at timestamptz not null default now()
);

-- Trigger para mantener updated_at en employees.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- Crear un profile automáticamente cuando se registra un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
