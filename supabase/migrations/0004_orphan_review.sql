-- Bandeja de revisión de horas huérfanas: estado, responsable y motivo.
alter table public.weekly_records
  add column if not exists review_status text
    check (review_status in ('corregido', 'descartado')),
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

comment on column public.weekly_records.review_status is
  'null = pendiente (si has_error); corregido = se ajustaron las horas; descartado = revisado y no se contabiliza';
