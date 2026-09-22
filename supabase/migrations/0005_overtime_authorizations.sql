-- Autorización previa de horas extra (jefe solicita, RRHH aprueba/rechaza).
create table public.overtime_authorizations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  year int not null,
  week int not null check (week between 1 and 53),
  hours numeric(6, 2) not null default 0,
  reason text,
  status text not null default 'solicitada'
    check (status in ('solicitada', 'aprobada', 'rechazada')),
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text
);

create index overtime_auth_employee_idx on public.overtime_authorizations (employee_id);
create index overtime_auth_status_idx on public.overtime_authorizations (status);

alter table public.overtime_authorizations enable row level security;

create policy "Lectura de autorizaciones segun alcance"
  on public.overtime_authorizations for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.employees e
      where e.id = overtime_authorizations.employee_id
        and e.manager_id = auth.uid()
    )
  );

create policy "Jefe solicita autorizaciones de su equipo"
  on public.overtime_authorizations for insert
  with check (
    public.current_role() = 'rrhh'
    or (
      public.current_role() = 'jefe'
      and exists (
        select 1 from public.employees e
        where e.id = overtime_authorizations.employee_id
          and e.manager_id = auth.uid()
      )
    )
  );

create policy "RRHH decide autorizaciones"
  on public.overtime_authorizations for update
  using (public.current_role() = 'rrhh')
  with check (public.current_role() = 'rrhh');
