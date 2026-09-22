import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import type { EmployeeStatus } from "@/lib/aggregate";
import { RULES } from "@/lib/overtime";

export function EmployeeTable({
  rows,
  hrefBase,
  roleParam,
}: {
  rows: EmployeeStatus[];
  /** Base para el enlace de detalle, p. ej. "/empleado" o "/demo/empleado". */
  hrefBase?: string;
  /** Rol a preservar en el enlace (demo). */
  roleParam?: string;
}) {
  const linkFor = (id: string) =>
    hrefBase
      ? `${hrefBase}/${id}${roleParam ? `?rol=${roleParam}` : ""}`
      : undefined;
  if (rows.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-500">
        No hay empleados para mostrar en este periodo.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Empleado</th>
            <th className="px-4 py-3 font-medium">Área</th>
            <th className="px-4 py-3 font-medium">Jefe</th>
            <th className="px-4 py-3 text-right font-medium">Extra semanal</th>
            <th className="px-4 py-3 text-right font-medium">Extra mensual</th>
            <th className="px-4 py-3 text-right font-medium">Disp. mes</th>
            <th className="px-4 py-3 font-medium">Proyección mes</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                {linkFor(r.id) ? (
                  <Link
                    href={linkFor(r.id)!}
                    className="font-medium text-brand hover:text-brand-dark hover:underline"
                  >
                    {r.name ?? r.code}
                  </Link>
                ) : (
                  <div className="font-medium text-slate-900">{r.name ?? r.code}</div>
                )}
                <div className="text-xs text-slate-400">
                  {r.code}
                  {r.roleTitle ? ` · ${r.roleTitle}` : ""}
                </div>
                {r.hasError && (
                  <div className="mt-1 text-xs font-medium text-amber-600">
                    ⚠ Registro con error (revisión manual)
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{r.area ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">{r.managerName ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className="text-slate-700">{r.weeklyOvertime.toFixed(1)}h</span>
                {r.weeklyHigh && (
                  <span
                    className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500"
                    title="Semana por encima de 12h (permitido; el límite es mensual)"
                  >
                    alto
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span
                  className={
                    r.monthlyOvertime > RULES.MONTHLY_OVERTIME_LIMIT
                      ? "font-semibold text-status-red"
                      : r.monthlyOvertime >= RULES.MONTHLY_OVERTIME_WARNING
                        ? "font-semibold text-status-yellow"
                        : "text-slate-700"
                  }
                >
                  {r.monthlyOvertime.toFixed(1)}h
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                {r.availableMonthly.toFixed(1)}h
              </td>
              <td className="px-4 py-3 text-xs">
                <span className={r.willExceedMonthly ? "font-medium text-status-red" : "text-slate-500"}>
                  ≈ {r.projectedMonthlyOvertime.toFixed(1)}h/mes
                  {r.willExceedMonthly ? " (excede 48h)" : ""}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge level={r.level} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
