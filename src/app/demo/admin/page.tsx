import { DEMO_DIRECTOR_DIRECCION } from "@/lib/demo";

export const dynamic = "force-dynamic";

const DEMO_ROLES = [
  { name: "Recursos Humanos", what: "Administración (RRHH)", sees: "Toda la organización", users: 1, base: true },
  { name: "Director General", what: "Consulta según alcance", sees: "Toda la organización", users: 0, base: true },
  { name: "Director Industrial", what: "Consulta según alcance", sees: `Direcciones: ${DEMO_DIRECTOR_DIRECCION}`, users: 1, base: false },
  { name: "Jefe inmediato", what: "Consulta de su equipo directo", sees: "Su equipo directo", users: 1, base: true },
];

const DEMO_USERS = [
  { name: "Recursos Humanos ALIÓN", email: "rrhh@ejemplo.co", role: "Recursos Humanos" },
  { name: "Director Industrial", email: "director.industrial@ejemplo.co", role: "Director Industrial" },
  { name: "Jefe Producción", email: "jefe@ejemplo.co", role: "Jefe inmediato" },
];

export default function DemoAdmin() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-heading">Usuarios y accesos</h1>
        <p className="text-sm text-ink-2">
          En la aplicación, Recursos Humanos crea usuarios con su correo y roles con nombre
          propio. Cada rol dice qué puede hacer la persona y qué puede ver.
        </p>
      </header>

      <div className="rounded-lg border border-risk-border bg-risk-soft px-4 py-2 text-xs text-risk">
        Vista de demostración (solo lectura).
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-heading">Roles</h2>
        <ul className="space-y-3">
          {DEMO_ROLES.map((r) => (
            <li key={r.name} className="rounded-lg border border-line bg-surface p-4">
              <p className="font-semibold text-heading">
                {r.name}
                {r.base && (
                  <span className="ml-2 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-normal text-ink-2">
                    base
                  </span>
                )}
              </p>
              <p className="text-[13px] text-ink-2">{r.what}</p>
              <p className="mt-1 text-[13px] text-ink-2">
                <span className="text-muted">Ve:</span> {r.sees} · {r.users} usuario
                {r.users === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-heading">Usuarios</h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase text-ink-2">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Usuario</th>
                <th scope="col" className="px-4 py-2 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DEMO_USERS.map((u) => (
                <tr key={u.email}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-ink">{u.name}</div>
                    <div className="text-xs text-ink-2">{u.email}</div>
                  </td>
                  <td className="px-4 py-2">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
