import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { assignManager, updateRole } from "./actions";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  rrhh: "Recursos Humanos",
  director: "Director General",
  jefe: "Jefe Inmediato",
};

export default async function AdminPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "rrhh") redirect("/dashboard");

  const supabase = createClient();
  const [{ data: profiles }, { data: employees }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role").order("email"),
    supabase
      .from("employees")
      .select("id, code, name, area, manager_id")
      .order("code"),
  ]);

  const jefes = (profiles ?? []).filter((p) => p.role === "jefe" || p.role === "rrhh");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usuarios y equipos"
        subtitle="Asigne el rol de cada usuario y vincule a cada empleado con su jefe inmediato. De ese vínculo depende lo que cada jefe puede ver en el panel."
      />

      {/* Roles de usuario */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Roles de usuario</h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Usuario</th>
                <th className="th">Rol actual</th>
                <th className="th">Cambiar rol</th>
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
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[p.role] ?? p.role}</td>
                  <td className="px-4 py-3">
                    <form action={updateRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select
                        name="role"
                        defaultValue={p.role}
                        className="field sm:w-56"
                      >
                        <option value="rrhh">Recursos Humanos</option>
                        <option value="director">Director General</option>
                        <option value="jefe">Jefe Inmediato</option>
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
                    Todavía no hay empleados. Cárguelos desde «Cargar horas del biométrico».
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
