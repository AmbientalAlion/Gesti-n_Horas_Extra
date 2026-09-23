-- Permite registrar la solicitud de horas extra por día concreto de la semana
-- en curso (para poder seleccionar varios días / "toda la semana"). Nullable
-- para conservar compatibilidad con las solicitudes ya existentes por semana.
alter table public.overtime_authorizations
  add column if not exists day_date date;

create index if not exists overtime_auth_day_idx
  on public.overtime_authorizations (day_date);
