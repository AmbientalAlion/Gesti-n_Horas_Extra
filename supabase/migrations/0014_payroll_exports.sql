-- Bitácora de exportaciones a nómina: quién descargó qué mes, cuándo, cuántas
-- filas y horas, y la huella SHA-256 del archivo (para saber si nómina recibió
-- exactamente ese archivo).

create table if not exists public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  exported_by uuid not null default auth.uid() references public.profiles (id),
  exported_at timestamptz not null default now(),
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  month_closed boolean not null,
  row_count int not null check (row_count >= 0),
  total_hours numeric(10, 2) not null check (total_hours >= 0),
  pending_weeks int not null default 0 check (pending_weeks >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$')
);

create index if not exists payroll_exports_period_idx
  on public.payroll_exports (year, month, exported_at desc);

alter table public.payroll_exports enable row level security;

create policy "Admin ve exportaciones a nómina"
  on public.payroll_exports for select
  using (public.is_admin());

-- Solo RRHH exporta, y solo a su nombre. Sin update ni delete: es una bitácora.
create policy "RRHH registra sus exportaciones"
  on public.payroll_exports for insert
  with check (public.current_role() = 'rrhh' and exported_by = auth.uid());

revoke all on public.payroll_exports from anon;
grant select, insert on public.payroll_exports to authenticated;
