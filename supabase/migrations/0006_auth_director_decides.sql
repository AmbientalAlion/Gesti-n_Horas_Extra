-- El Director de planta también puede aprobar/rechazar autorizaciones.
drop policy if exists "RRHH decide autorizaciones" on public.overtime_authorizations;

create policy "RRHH o Director deciden autorizaciones"
  on public.overtime_authorizations for update
  using (public.current_role() in ('rrhh', 'director'))
  with check (public.current_role() in ('rrhh', 'director'));
