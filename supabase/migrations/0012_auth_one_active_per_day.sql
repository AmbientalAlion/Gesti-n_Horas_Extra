-- Defensa en profundidad: como máximo una autorización ACTIVA (solicitada o
-- aprobada) por empleado y día. Evita superar el tope de 5h/día mediante
-- solicitudes separadas. Las filas antiguas sin día (day_date null) quedan
-- excluidas por el WHERE.
create unique index if not exists overtime_auth_one_active_per_day
  on public.overtime_authorizations (employee_id, day_date)
  where day_date is not null and status in ('solicitada', 'aprobada');
