-- Requerimientos v2: las horas se guardan por TRAMO (parte de una semana ISO
-- dentro de un mes calendario). Una semana que cruza de mes produce dos filas:
-- (año, mes, semana) del primer mes y (año, mes, semana) del segundo.
--
--  - year / month = año y mes CALENDARIO del tramo.
--  - week         = semana ISO a la que pertenece.
--  - last_date    = último día con datos del tramo (fecha de corte, RF-04).
--  - estimated    = horas repartidas por días porque el archivo semanal no trae
--                   detalle diario y la semana cruza de mes (D-3).
--
-- Las filas existentes se conservan: quedan como un tramo con la semana
-- completa. Al volver a cargar los archivos del mes, se reemplazan por tramos.

alter table public.weekly_records
  add column if not exists last_date date,
  add column if not exists estimated boolean not null default false;

alter table public.weekly_records
  drop constraint if exists weekly_records_employee_id_year_week_key;

alter table public.weekly_records
  add constraint weekly_records_segment_key unique (employee_id, year, month, week);

comment on column public.weekly_records.year is 'Año calendario del mes del tramo.';
comment on column public.weekly_records.month is 'Mes calendario del tramo (1-12).';
comment on column public.weekly_records.week is 'Semana ISO a la que pertenece el tramo.';
comment on column public.weekly_records.last_date is 'Último día con datos del tramo.';
comment on column public.weekly_records.estimated is 'Horas repartidas por días (semana que cruza de mes sin detalle diario).';
