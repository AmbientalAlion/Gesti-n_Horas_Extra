-- Requerimientos v2 · Control de acceso por rol y alcance.
--
--   RRHH      → toda la organización.
--   Director  → solo las direcciones asignadas ('*' = todas, p. ej. Director General).
--   Jefe      → solo su equipo directo (employees.manager_id = su usuario).
--   Sin rol   → no ve datos (una cuenta nueva nace sin rol).
--
-- Una sola función decide qué persona puede ver cada usuario; las políticas de
-- empleados y registros la usan. Quien tiene dos papeles (director que también
-- es jefe) ve la unión.

-- 1. Cuenta nueva sin rol (antes nacía como 'jefe': acceso por defecto).
alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role drop default;

-- 2. Direcciones asignadas a cada director.
create table if not exists public.user_direcciones (
  user_id uuid not null references public.profiles (id) on delete cascade,
  direccion text not null check (length(trim(direccion)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  primary key (user_id, direccion)
);

alter table public.user_direcciones enable row level security;

create policy "Cada usuario ve sus direcciones; RRHH todas"
  on public.user_direcciones for select
  using (user_id = auth.uid() or public.current_role() = 'rrhh');

create policy "RRHH administra direcciones"
  on public.user_direcciones for all
  using (public.current_role() = 'rrhh')
  with check (public.current_role() = 'rrhh');

revoke all on public.user_direcciones from anon;

-- Los directores actuales conservan su acceso de hoy (todas las direcciones)
-- hasta que RRHH lo ajuste desde «Usuarios y accesos».
insert into public.user_direcciones (user_id, direccion, created_by)
select id, '*', null from public.profiles where role = 'director'
on conflict do nothing;

-- 3. Regla única de visibilidad.
create or replace function public.can_see_employee(emp_direccion text, emp_manager uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select case public.current_role()
    when 'rrhh' then true
    when 'director' then
      emp_manager = auth.uid()
      or exists (
        select 1 from public.user_direcciones d
        where d.user_id = auth.uid()
          and (d.direccion = '*' or d.direccion = emp_direccion)
      )
    when 'jefe' then emp_manager = auth.uid()
    else false
  end;
$$;

revoke execute on function public.can_see_employee(text, uuid) from anon, public;
grant execute on function public.can_see_employee(text, uuid) to authenticated;

drop policy if exists "Admin ve todos los empleados" on public.employees;
create policy "Lectura de empleados según alcance"
  on public.employees for select
  using (public.can_see_employee(direccion, manager_id));

-- En producción el nombre quedó sin tilde; se eliminan ambas variantes.
drop policy if exists "Lectura de registros según alcance" on public.weekly_records;
drop policy if exists "Lectura de registros segun alcance" on public.weekly_records;
create policy "Lectura de registros según alcance"
  on public.weekly_records for select
  using (
    exists (
      select 1 from public.employees e
      where e.id = weekly_records.employee_id
        and public.can_see_employee(e.direccion, e.manager_id)
    )
  );

-- 4. Bitácora de cambios de acceso (RF-28): quién, cuándo, antes y después.
create table if not exists public.access_log (
  id uuid primary key default gen_random_uuid(),
  changed_at timestamptz not null default now(),
  changed_by uuid not null default auth.uid() references public.profiles (id),
  user_id uuid references public.profiles (id) on delete set null,
  employee_id uuid references public.employees (id) on delete set null,
  field text not null check (field in ('role', 'direcciones', 'manager')),
  old_value text,
  new_value text
);

alter table public.access_log enable row level security;

create policy "RRHH ve la bitácora de accesos"
  on public.access_log for select
  using (public.current_role() = 'rrhh');

create policy "RRHH registra cambios de acceso"
  on public.access_log for insert
  with check (public.current_role() = 'rrhh' and changed_by = auth.uid());

revoke all on public.access_log from anon;

-- 5. Se retira el flujo de autorizaciones (RF-30): nadie puede crear, aprobar
--    ni rechazar solicitudes. El histórico queda en solo lectura (D-5).
revoke insert, update, delete on public.overtime_authorizations from authenticated, anon;
