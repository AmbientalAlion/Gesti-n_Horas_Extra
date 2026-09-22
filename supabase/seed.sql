-- Datos semilla opcionales para desarrollo.
-- Ejecutar DESPUÉS de crear al menos un usuario en Supabase Auth y de conocer
-- su id (auth.users.id) para asignarle el rol correspondiente.

-- 1. Asignar rol de RRHH a un usuario existente (reemplazar el UUID).
-- update public.profiles set role = 'rrhh' where email = 'rrhh@alion.com.co';

-- 2. Empleados de ejemplo (el manager_id debe ser el id de un profile 'jefe').
-- insert into public.employees (code, name, role_title, area) values
--   ('1001', 'Ana Restrepo', 'Operaria', 'Producción'),
--   ('1002', 'Carlos Gómez', 'Operario', 'Producción'),
--   ('3001', 'Gustavo León', 'Técnico', 'Mantenimiento')
-- on conflict (code) do nothing;

-- Nota: las horas se cargan mediante el Módulo de Carga (CSV biométrico),
-- que hace upsert sobre public.weekly_records.
