import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { assignManager, setDirecciones, updateRole } from "./actions";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  rrhh: "Recursos Humanos",
  director: "Director",
  jefe: "Jefe inmediato",
};

export default async function AdminPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "rrhh") redirect("/dashboard");

  const supabase = createClient();
  const [{ data: profiles }, { data: employees }, scopesRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role").order("email"),
    supabase
      .from("employees")
      .select("id, code, name, area, direccion, manager_id")
      .order("code"),
    supabase.from("user_direcciones").select("user_id, direccion"),
  ]);
  // Si la migración de alcances aún no está aplicada, la tabla no existe.
  const scopesReady = !scopesRes.error;
  const scopes = new Map<string, string[]>();
  for (const r of scopesRes.data ?? []) {
    scopes.set(r.user_id, [...(scopes.get(r.user_id) ?? []), r.direccion]);
  }
  const direcciones = [
    ...new Set((employees ?? []).map((e) => e.direccion).filter((d): d is string => !!d)),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const jefes = (profiles ?? []).filter(
    (p) => p.role === "jefe" || p.role === "rrhh" || p.role === "director"
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usuarios y accesos"
        subtitle="El rol dice qué puede hacer cada usuario y el alcance a quién puede ver: RRHH ve toda la organización, un director sus direcciones y un jefe a su equipo directo. Una cuenta sin rol no ve datos."
      />

      {/* Roles de usuario */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Roles de usuario</h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Usuario</th>
                <th className="th">Rol</th>
                <th className="th">Alcance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(profiles ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-600">
                    Todavía no hay usuarios registrados.
                  </td>
                </tr>
              )}
              {(profiles ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.full_name ?? p.email}</div>
                    <div className="text-[13px] text-slate-600">{p.email}</div>
                    <div className="text-[12px] text-slate-500">{p.role ? ROLE_LABEL[p.role] : "Sin rol"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <label className="sr-only" htmlFor={`rol-${p.id}`}>
                        Rol de {p.full_name ?? p.email}
                      </label>
                      <select
                        id={`rol-${p.id}`}
                        name="role"
                        defaultValue={p.role ?? ""}
                        className="field sm:w-52"
                      >
                        <option value="">Sin rol (sin acceso)</option>
                        <option value="rrhh">Recursos Humanos</option>
                        <option value="director">Director</option>
                        <option value="jefe">Jefe inmediato</option>
                      </select>
                      <SubmitButton label="Guardar" pendingLabel="Guardando…" variant="secondary" />
                    </form>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.role === "rrhh" && "Toda la organización"}
                    {p.role === "jefe" && "Su equipo directo (ver abajo)"}
                    {!p.role && <span className="text-slate-500">Ninguno</span>}
                    {p.role === "director" &&
                      (scopesReady ? (
                        <form action={setDirecciones} className="space-y-1.5">
                          <input type="hidden" name="id" value={p.id} />
                          <label className="flex items-center gap-2 text-[13px]">
                            <input
                              type="checkbox"
                              name="todas"
                              defaultChecked={(scopes.get(p.id) ?? []).includes("*")}
                            />
                            Todas las direcciones (Director General)
                          </label>
                          {direcciones.map((d) => (
                            <label key={d} className="flex items-center gap-2 text-[13px]">
                              <input
                                type="checkbox"
                                name="direccion"
                                value={d}
                                defaultChecked={(scopes.get(p.id) ?? []).includes(d)}
                              />
                              {d}
                            </label>
                          ))}
                          <SubmitButton label="Guardar alcance" pendingLabel="Guardando…" variant="secondary" />
                        </form>
                      ) : (
                        <span className="text-[13px] text-amber-700">
                          Falta aplicar la migración de alcances en la base de datos.
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Vinculación empleado -> jefe */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          Empleados y su jefe inmediato
        </h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Empleado</th>
                <th className="th">Área</th>
                <th className="th">Jefe asignado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(employees ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-600">
                    Todavía no hay empleados. Cárguelos desde «Cargar archivo».
                  </td>
                </tr>
              )}
              {(employees ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{e.name ?? e.code}</div>
                    <div className="text-[13px] text-slate-600">{e.code}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.area ?? "—"}</td>
                  <td className="px-4 py-3">
                    <form action={assignManager} className="flex items-center gap-2">
                      <input type="hidden" name="employeeId" value={e.id} />
                      <select
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
      </section>

      <p className="text-xs text-slate-500">
        Nota: para <strong>invitar usuarios nuevos</strong> se requiere la service role
        de Supabase (o el envío de invitaciones desde el panel de Supabase). Aquí se
        gestionan los roles de usuarios existentes y la vinculación de equipos.
      </p>
    </div>
  );
}
