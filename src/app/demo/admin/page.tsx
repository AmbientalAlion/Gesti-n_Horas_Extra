import { demoEmployees } from "@/lib/demo";

export const dynamic = "force-dynamic";

const DEMO_USERS = [
  { name: "Recursos Humanos ALIÓN", email: "rrhh@alion.com.co", role: "Recursos Humanos" },
  { name: "Director General", email: "director@alion.com.co", role: "Director General" },
  { name: "Jefe Producción", email: "jefe@alion.com.co", role: "Jefe Inmediato" },
];

export default function DemoAdmin() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">Usuarios y equipos</h1>
        <p className="text-sm text-slate-500">
          En la app real, RRHH asigna roles y vincula cada empleado con su jefe
          inmediato desde aquí, sin tocar la base de datos.
        </p>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Vista de demostración (solo lectura).
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Roles de usuario</h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Usuario</th>
                <th className="px-4 py-2 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_USERS.map((u) => (
                <tr key={u.email}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          Empleados y su jefe inmediato
        </h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Empleado</th>
                <th className="px-4 py-2 font-medium">Área</th>
                <th className="px-4 py-2 font-medium">Jefe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoEmployees.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-slate-900">{e.name}</div>
                    <div className="text-xs text-slate-400">{e.code}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{e.area}</td>
                  <td className="px-4 py-2 text-slate-600">{e.managerName ?? "Sin asignar"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
