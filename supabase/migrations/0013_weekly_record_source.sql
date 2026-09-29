-- Origen del registro semanal y totales opcionales.
--
-- El formato "novedades" solo trae eventos de horas extra por recargo: no hay
-- horas totales ni turno máximo, así que no se pueden inventar (antes se
-- guardaba 42 + extra). Con total_hours nulo la interfaz muestra «—» y no se
-- afirma nada sobre horas huérfanas para esos registros.

alter table public.weekly_records
  add column if not exists source text not null default 'biometrico'
  check (source in ('biometrico', 'novedades'));

alter table public.weekly_records
  alter column total_hours drop not null,
  alter column total_hours drop default;

-- Registros ya cargados desde novedades: tenían recargos y un total inventado.
update public.weekly_records
   set source = 'novedades', total_hours = null
 where ot_extra_diurna + ot_extra_nocturna + ot_dom_diurna + ot_dom_nocturna > 0
   and total_hours is not null
   and abs(total_hours - (42 + overtime_hours)) < 0.01;

comment on column public.weekly_records.source is
  'biometrico: horas totales y turno máximo (permite detectar horas huérfanas). novedades: solo eventos de horas extra por recargo.';
