-- Endurecimiento de seguridad (recomendaciones del linter de Supabase).

-- 1. Fijar search_path en set_updated_at (function_search_path_mutable).
alter function public.set_updated_at() set search_path = public;

-- 2. La función del trigger de creación de perfil no debe ser invocable por la
--    API (PostgREST). El trigger la sigue ejecutando (corre como su owner).
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Nota: public.current_role() y public.is_admin() conservan EXECUTE porque las
-- políticas RLS las invocan en el contexto del rol que consulta; revocarlas
-- rompería RLS. Solo exponen el rol/condición de admin del propio solicitante.

-- Pendiente (configuración de Auth, en el panel de Supabase, no vía SQL):
--   Habilitar "Leaked Password Protection" (HaveIBeenPwned) en
--   Authentication → Policies para rechazar contraseñas comprometidas.
