-- Políticas RLS (Row Level Security) por rol.
--   rrhh / director: visión global de toda la planta.
--   jefe: solo empleados bajo su cargo directo (manager_id = su profile).

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.weekly_records enable row level security;
alter table public.uploads enable row level security;

-- Helper: rol del usuario autenticado.
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.current_role() in ('rrhh', 'director');
$$;

-- ---------- profiles ----------
create policy "Los usuarios ven su propio perfil"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "RRHH/Director gestionan perfiles"
  on public.profiles for all
  using (public.current_role() = 'rrhh')
  with check (public.current_role() = 'rrhh');

-- ---------- employees ----------
create policy "Admin ve todos los empleados"
  on public.employees for select
  using (public.is_admin() or manager_id = auth.uid());

create policy "RRHH administra empleados"
  on public.employees for all
  using (public.current_role() = 'rrhh')
  with check (public.current_role() = 'rrhh');

-- ---------- weekly_records ----------
create policy "Lectura de registros según alcance"
  on public.weekly_records for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.employees e
      where e.id = weekly_records.employee_id
        and e.manager_id = auth.uid()
    )
  );

create policy "RRHH administra registros"
  on public.weekly_records for all
  using (public.current_role() = 'rrhh')
  with check (public.current_role() = 'rrhh');

-- ---------- uploads ----------
create policy "Admin ve auditoría de cargas"
  on public.uploads for select
  using (public.is_admin());

create policy "RRHH registra cargas"
  on public.uploads for insert
  with check (public.current_role() = 'rrhh');
