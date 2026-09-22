import { demoDashboard } from "@/lib/demo";
import type { Role } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default function DemoExport({
  searchParams,
}: {
  searchParams: { rol?: string };
}) {
  const role = (["rrhh", "director", "jefe"].includes(searchParams.rol ?? "")
    ? searchParams.rol
    : "rrhh") as Role;

  const { statuses, period } = demoDashboard(role);
  const exportable = statuses.filter((s) => !s.hasError && s.monthlyOvertime > 0);
  const excluded = statuses.filter((s) => s.hasError);
  const href = `/api/export?demo=1&rol=${role}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">Módulo de exportación</h1>
        <p className="text-sm text-slate-500">
          Descarga un CSV limpio con las novedades de horas extras depuradas,
          listo para el software de nómina.
        </p>
      </header>

      <div className="card">
        <p className="text-sm text-slate-600">
          Periodo: <strong>{MONTHS[period.month - 1]} {period.year}</strong>
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          <li>✅ {exportable.length} empleados con novedades de horas extra</li>
          <li>⚠ {excluded.length} registros excluidos por error (revisión manual)</li>
        </ul>
        <a href={href} download className="btn-primary mt-4 inline-flex">
          Descargar CSV de nómina
        </a>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 text-right font-medium">Horas extra (mes)</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exportable.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2">{s.code}</td>
                <td className="px-4 py-2">{s.name ?? "—"}</td>
                <td className="px-4 py-2">{s.area ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {s.monthlyOvertime.toFixed(1)}h
                </td>
                <td className="px-4 py-2">
                  <StatusBadge level={s.level} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
