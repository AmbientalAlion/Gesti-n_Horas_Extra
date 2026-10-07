import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isAdminApiConfigured } from "@/lib/supabase/admin";
import { assignManager } from "./actions";
import {
  AssignRoleForm,
  CreateUserForm,
  ResetPasswordForm,
  RoleCard,
  RoleForm,
  type RoleOption,
  type ScopeCatalog,
} from "./forms";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const FIELD_TEXT: Record<string, string> = {
  alta: "Alta de usuario",
  rol_acceso: "Cambio de rol",
  role: "Cambio de nivel",
  contrasena: "Contraseña restablecida",
  manager: "Cambio de jefe",
  direcciones: "Cambio de direcciones",
};

const uniq = (xs: (string | null | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => !!x && x.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

export default async function AdminPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "rrhh") redirect("/dashboard");

  const supabase = createClient();
  const [profilesRes, employeesRes, rolesRes, scopesRes, logRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, access_role_id, must_change_password").order("email"),
    supabase
      .from("employees")
      .select("id, code, name, area, direccion, plant, manager_id")
      .order("code"),
    supabase.from("access_roles").select("id, name, description, level, scope_all, system").order("name"),
    supabase.from("access_role_scopes").select("role_id, dim, value"),
    supabase
      .from("access_log")
      .select("changed_at, field, old_value, new_value, user_id, employee_id")
      .order("changed_at", { ascending: false })
      .limit(15),
  ]);

  const profiles = profilesRes.data ?? [];
  const employees = employeesRes.data ?? [];
  const rolesReady = !rolesRes.error;
  const adminApi = isAdminApiConfigured();

  const roles: RoleOption[] = (rolesRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    level: r.level,
    scopeAll: r.scope_all,
    system: r.system,
    scopes: (scopesRes.data ?? [])
      .filter((s) => s.role_id === r.id)
      .map((s) => ({ dim: s.dim, value: s.value })),
    users: profiles.filter((p) => p.access_role_id === r.id).length,
  }));
  // Los roles base primero; luego los creados por RRHH.
  roles.sort((a, b) => Number(b.system) - Number(a.system) || a.name.localeCompare(b.name, "es"));

  const catalog: ScopeCatalog = {
    direccion: uniq(employees.map((e) => e.direccion)),
    planta: uniq(employees.map((e) => e.plant)),
    area: uniq(employees.map((e) => e.area)),
  };
  const personName = new Map(profiles.map((p) => [p.id, p.full_name ?? p.email]));
  const jefes = profiles.filter((p) => p.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y accesos"
        subtitle="Cree usuarios con su correo y asígneles un rol. Cada rol dice qué puede hacer la persona y qué puede ver: toda la organización, ciertas direcciones, plantas o áreas, o su equipo directo."
      />

      {!rolesReady && (
        <div className="rounded-lg border border-risk-border bg-risk-soft px-4 py-3 text-sm text-risk">
          Falta aplicar la migración de roles en la base de datos.
        </div>
      )}

      {/* Crear usuario */}
      <section className="card space-y-3" aria-labelledby="nuevo-usuario">
        <h2 id="nuevo-usuario" className="text-lg font-semibold text-heading">
          Nuevo usuario
        </h2>
        {!adminApi && (
          <div className="rounded-lg border border-risk-border bg-risk-soft px-3 py-2 text-sm text-risk">
            Para crear cuentas desde aquí falta agregar la llave de servicio de Supabase en
            Vercel (variable <code>SUPABASE_SERVICE_ROLE_KEY</code>). Mientras tanto puede crear
            roles y asignarlos a los usuarios que ya existen.
          </div>
        )}
        <p className="text-sm text-ink-2">
          Se genera una contraseña temporal que usted entrega a la persona; al entrar por
          primera vez deberá crear la suya.
        </p>
        <CreateUserForm roles={roles} enabled={adminApi && rolesReady} />
      </section>

      {/* Usuarios */}
      <section aria-labelledby="usuarios">
        <h2 id="usuarios" className="mb-3 text-lg font-semibold text-heading">
          Usuarios ({profiles.length})
        </h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="th">Usuario</th>
                <th scope="col" className="th">Rol</th>
                <th scope="col" className="th">Contraseña</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-ink-2">
                    Todavía no hay usuarios.
                  </td>
                </tr>
              )}
              {profiles.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{p.full_name ?? p.email}</div>
                    <div className="text-[13px] text-ink-2">{p.email}</div>
                    {p.must_change_password && (
                      <div className="text-[12px] text-risk">Pendiente de crear su contraseña</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rolesReady ? (
                      <AssignRoleForm
                        userId={p.id}
                        currentRoleId={p.access_role_id}
                        roles={roles}
                        label={p.full_name ?? p.email}
                      />
                    ) : (
                      <span className="text-ink-2">{p.role ?? "Sin rol"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.id === profile.id ? (
                      <a href="/cuenta/contrasena" className="text-sm text-heading underline">
                        Cambiar la mía
                      </a>
                    ) : (
                      <ResetPasswordForm userId={p.id} email={p.email} enabled={adminApi} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Roles */}
      {rolesReady && (
        <section aria-labelledby="roles" className="space-y-3">
          <h2 id="roles" className="text-lg font-semibold text-heading">
            Roles ({roles.length})
          </h2>
          <ul className="space-y-3">
            {roles.map((r) => (
              <RoleCard key={r.id} role={r} catalog={catalog} />
            ))}
          </ul>
          <CollapsibleCard
            title="Crear un rol"
            subtitle="Por ejemplo «Director Industrial»: consulta según alcance, con la Dirección Industrial marcada."
            defaultOpen={roles.length <= 3}
          >
            <RoleForm catalog={catalog} />
          </CollapsibleCard>
        </section>
      )}

      {/* Equipos */}
      <CollapsibleCard
        title="Empleados y su jefe inmediato"
        subtitle="Un usuario con rol de jefe ve a las personas que lo tienen como jefe inmediato."
        defaultOpen={false}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="th">Empleado</th>
                <th scope="col" className="th">Área</th>
                <th scope="col" className="th">Jefe asignado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {employees.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-ink-2">
                    Todavía no hay empleados. Cárguelos desde «Cargar archivo».
                  </td>
                </tr>
              )}
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{e.name ?? e.code}</div>
                    <div className="text-[13px] text-ink-2">{e.code}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{e.area ?? "—"}</td>
                  <td className="px-4 py-3">
                    <form action={assignManager} className="flex items-center gap-2">
                      <input type="hidden" name="employeeId" value={e.id} />
                      <label className="sr-only" htmlFor={`jefe-${e.id}`}>
                        Jefe de {e.name ?? e.code}
                      </label>
                      <select
                        id={`jefe-${e.id}`}
                        name="managerId"
                        defaultValue={e.manager_id ?? ""}
                        className="field sm:w-56"
                      >
                        <option value="">Sin asignar</option>
                        {jefes.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.full_name ?? j.email}
                          </option>
                        ))}
                      </select>
                      <SubmitButton label="Guardar" pendingLabel="Guardando…" variant="secondary" />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      {/* Bitácora */}
      {!logRes.error && (
        <CollapsibleCard title="Últimos cambios de acceso" defaultOpen={false}>
          {(logRes.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-2">Sin cambios registrados.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {(logRes.data ?? []).map((l, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 py-2">
                  <span className="tabular-nums text-muted">
                    {new Date(l.changed_at).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="font-medium text-ink">{FIELD_TEXT[l.field] ?? l.field}</span>
                  <span className="text-ink-2">
                    {l.user_id ? personName.get(l.user_id) ?? "usuario" : ""}
                    {l.field === "rol_acceso" && `: ${l.old_value ?? "sin rol"} → ${l.new_value ?? "sin rol"}`}
                    {l.field === "alta" && `: ${l.new_value}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      )}
    </div>
  );
}
