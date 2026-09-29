-- Roles con nombre propio creados por RRHH (p. ej. «Director Industrial»).
--
-- Un rol de acceso tiene:
--   - level: lo que puede HACER.
--       rrhh     → administra usuarios, cargas, revisiones y nómina; ve todo.
--       director → consulta, con el alcance del rol.
--       jefe     → consulta a su equipo directo.
--   - alcance (solo nivel director): toda la organización (scope_all) o una
--     lista de direcciones, plantas y áreas (access_role_scopes).
--
-- profiles.access_role_id apunta al rol; profiles.role (el nivel) se copia
-- solo desde el rol mediante un disparador, así las políticas existentes que
-- usan current_role() siguen funcionando.
--
-- Reemplaza a user_direcciones (0016): el alcance vive en el rol.

create table if not exists public.access_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  description text,
  level public.app_role not null,
  scope_all boolean not null default false,
  system boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null
);

create table if not exists public.access_role_scopes (
  role_id uuid not null references public.access_roles (id) on delete cascade,
  dim text not null check (dim in ('direccion', 'planta', 'area')),
  value text not null check (length(trim(value)) > 0),
  primary key (role_id, dim, value)
);

alter table public.profiles
  add column if not exists access_role_id uuid references public.access_roles (id) on delete set null,
  add column if not exists must_change_password boolean not null default false;

insert into public.access_roles (name, description, level, scope_all, system) values
  ('Recursos Humanos', 'Administra usuarios, cargas, revisiones y nómina. Ve toda la organización.', 'rrhh', true, true),
  ('Director General', 'Consulta toda la organización.', 'director', true, true),
  ('Jefe inmediato', 'Consulta a su equipo directo.', 'jefe', false, true)
on conflict (name) do nothing;

-- Los usuarios actuales quedan con el rol equivalente al que ya tenían.
update public.profiles p
   set access_role_id = r.id
  from public.access_roles r
 where p.access_role_id is null
   and ((p.role = 'rrhh' and r.name = 'Recursos Humanos')
     or (p.role = 'director' and r.name = 'Director General')
     or (p.role = 'jefe' and r.name = 'Jefe inmediato'));

-- El nivel del perfil se copia del rol asignado.
create or replace function public.sync_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.access_role_id is null then
    new.role := null;
  else
    select level into new.role from public.access_roles where id = new.access_role_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_role on public.profiles;
create trigger profiles_sync_role
  before insert or update of access_role_id on public.profiles
  for each row execute function public.sync_profile_role();

-- Si RRHH cambia el nivel de un rol, se actualiza a todos sus usuarios.
create or replace function public.sync_role_level()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set role = new.level where access_role_id = new.id;
  return new;
end;
$$;

drop trigger if exists access_roles_sync_level on public.access_roles;
create trigger access_roles_sync_level
  after update of level on public.access_roles
  for each row execute function public.sync_role_level();

revoke execute on function public.sync_profile_role() from anon, authenticated, public;
revoke execute on function public.sync_role_level() from anon, authenticated, public;

-- RLS: RRHH administra; cada usuario puede leer su propio rol.
alter table public.access_roles enable row level security;
alter table public.access_role_scopes enable row level security;

create policy "RRHH administra roles"
  on public.access_roles for all
  using (public.current_role() = 'rrhh')
  with check (public.current_role() = 'rrhh');

create policy "Cada usuario ve su rol"
  on public.access_roles for select
  using (id = (select access_role_id from public.profiles where id = auth.uid()));

create policy "RRHH administra alcances de roles"
  on public.access_role_scopes for all
  using (public.current_role() = 'rrhh')
  with check (public.current_role() = 'rrhh');

create policy "Cada usuario ve el alcance de su rol"
  on public.access_role_scopes for select
  using (role_id = (select access_role_id from public.profiles where id = auth.uid()));

revoke all on public.access_roles, public.access_role_scopes from anon;

-- Regla única de visibilidad, ahora con dirección, planta y área.
create or replace function public.can_see_employee(
  emp_direccion text,
  emp_plant text,
  emp_area text,
  emp_manager uuid
)
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
        select 1
          from public.profiles p
          join public.access_roles r on r.id = p.access_role_id
         where p.id = auth.uid()
           and (
             r.scope_all
             or exists (
               select 1 from public.access_role_scopes s
                where s.role_id = r.id
                  and ((s.dim = 'direccion' and s.value = emp_direccion)
                    or (s.dim = 'planta' and s.value = emp_plant)
                    or (s.dim = 'area' and s.value = emp_area))
             )
           )
      )
    when 'jefe' then emp_manager = auth.uid()
    else false
  end;
$$;

revoke execute on function public.can_see_employee(text, text, text, uuid) from anon, public;
grant execute on function public.can_see_employee(text, text, text, uuid) to authenticated;

drop policy if exists "Lectura de empleados según alcance" on public.employees;
create policy "Lectura de empleados según alcance"
  on public.employees for select
  using (public.can_see_employee(direccion, plant, area, manager_id));

drop policy if exists "Lectura de registros según alcance" on public.weekly_records;
create policy "Lectura de registros según alcance"
  on public.weekly_records for select
  using (
    exists (
      select 1 from public.employees e
      where e.id = weekly_records.employee_id
        and public.can_see_employee(e.direccion, e.plant, e.area, e.manager_id)
    )
  );

drop function if exists public.can_see_employee(text, uuid);
drop table if exists public.user_direcciones;

-- Quien cambia su contraseña temporal apaga su propio aviso.
create or replace function public.password_changed()
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;

revoke execute on function public.password_changed() from anon, public;
grant execute on function public.password_changed() to authenticated;

-- Bitácora: nuevos tipos de cambio.
alter table public.access_log drop constraint if exists access_log_field_check;
alter table public.access_log
  add constraint access_log_field_check
  check (field in ('role', 'direcciones', 'manager', 'alta', 'rol_acceso', 'contrasena'));
