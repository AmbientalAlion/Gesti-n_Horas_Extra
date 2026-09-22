import { StatusBadge } from "./StatusBadge";
import type { EmployeeStatus } from "@/lib/aggregate";
import { RULES } from "@/lib/overtime";

export function EmployeeTable({ rows }: { rows: EmployeeStatus[] }) {
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
            <th className="px-4 py-3 font-medium">Proyección</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{r.name ?? r.code}</div>
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
                <span
                  className={
                    r.weeklyOvertime > RULES.WEEKLY_OVERTIME_LIMIT
                      ? "font-semibold text-status-red"
                      : r.weeklyOvertime >= RULES.WEEKLY_OVERTIME_WARNING
                        ? "font-semibold text-status-yellow"
                        : "text-slate-700"
                  }
                >
                  {r.weeklyOvertime.toFixed(1)}h
                </span>
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
              <td className="px-4 py-3 text-xs text-slate-500">
                {r.projectedWeeklyOvertime != null ? (
                  <span className={r.willExceedWeekly ? "text-status-red" : "text-slate-500"}>
                    ≈ {r.projectedWeeklyOvertime.toFixed(1)}h al cierre
                    {r.willExceedWeekly ? " (excede)" : ""}
                  </span>
                ) : (
                  "—"
                )}
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
