-- Tope de 5 horas por solicitud (defensa en profundidad, además de la UI).
alter table public.overtime_authorizations
  add constraint overtime_auth_hours_cap check (hours > 0 and hours <= 5);
