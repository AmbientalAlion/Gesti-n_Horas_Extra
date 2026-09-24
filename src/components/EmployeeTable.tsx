import Link from "next/link";
import clsx from "clsx";
import { StatusBadge } from "./StatusBadge";
import type { EmployeeStatus } from "@/lib/aggregate";
import { RULES } from "@/lib/overtime";

/** Color de la cifra mensual según cuán cerca está del límite legal. */
function monthlyClass(v: number): string {
  if (v > RULES.MONTHLY_OVERTIME_LIMIT) return "font-semibold text-status-red";
  if (v >= RULES.MONTHLY_OVERTIME_WARNING) return "font-semibold text-status-yellow";
  return "text-slate-700";
}

export function EmployeeTable({
  rows,
  hrefBase,
  roleParam,
  query,
}: {
  rows: EmployeeStatus[];
  /** Base para el enlace de detalle, p. ej. "/empleado" o "/demo/empleado". */
  hrefBase?: string;
  /** Rol a preservar en el enlace (demo). */
  roleParam?: string;
  /** Filtros vigentes, para volver al panel tal como estaba. */
  query?: string;
}) {
  const linkFor = (id: string) => {
    if (!hrefBase) return undefined;
    const qs = [query, roleParam ? `rol=${roleParam}` : ""]
      .filter(Boolean)
      .join("&");
    return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
  };

  if (rows.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-sm font-medium text-brand-dark">Sin resultados</p>
        <p className="mt-1 text-sm text-slate-600">
          Ninguna persona coincide con los filtros de este periodo. Quite algún
          filtro para ampliar la búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0 sm:overflow-x-auto">
      {/* Teléfono: una tarjeta por persona (la tabla de 8 columnas no cabe). */}
      <ul className="divide-y divide-slate-100 sm:hidden">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {linkFor(r.id) ? (
                  <Link
                    href={linkFor(r.id)!}
                    className="block truncate font-medium text-brand-dark underline-offset-2 hover:underline"
                  >
                    {r.name ?? r.code}
                  </Link>
                ) : (
                  <span className="block truncate font-medium text-slate-900">
                    {r.name ?? r.code}
                  </span>
                )}
                <span className="block truncate text-[13px] text-slate-600">
                  {r.code}
                  {r.area ? ` · ${r.area}` : ""}
                </span>
              </div>
              <StatusBadge level={r.level} />
            </div>

            {r.hasError && (
              <p className="mt-1.5 text-[13px] font-medium text-amber-700">
                Registro por revisar (horas huérfanas)
              </p>
            )}

            <dl className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-slate-500">Mes</dt>
                <dd className={clsx("text-sm tabular-nums", monthlyClass(r.monthlyOvertime))}>
                  {r.monthlyOvertime.toFixed(1)}h
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Le quedan</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-700">
                  {r.availableMonthly.toFixed(1)}h
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Proyección</dt>
                <dd
                  className={clsx(
                    "text-sm font-semibold tabular-nums",
                    r.willExceedMonthly ? "text-status-red" : "text-slate-700"
                  )}
                >
                  ≈{r.projectedMonthlyOvertime.toFixed(0)}h
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla completa. */}
      <table className="hidden min-w-full divide-y divide-slate-200 text-sm sm:table">
        <thead className="bg-slate-50">
          <tr>
            <th className="th">Empleado</th>
            <th className="th">Área</th>
            <th className="th">Jefe</th>
            <th className="th-num">Extra esta semana</th>
            <th className="th-num">Extra del mes</th>
            <th className="th-num">Le quedan este mes</th>
            <th className="th-num">Proyección de cierre</th>
            <th className="th">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3.5">
                {linkFor(r.id) ? (
                  <Link
                    href={linkFor(r.id)!}
                    className="font-medium text-brand-dark underline-offset-2 hover:underline"
                  >
                    {r.name ?? r.code}
                  </Link>
                ) : (
                  <div className="font-medium text-slate-900">{r.name ?? r.code}</div>
                )}
                <div className="text-[13px] text-slate-600">
                  {r.code}
                  {r.roleTitle ? ` · ${r.roleTitle}` : ""}
                </div>
                {r.hasError && (
                  <div className="mt-1 text-[13px] font-medium text-amber-700">
                    Registro por revisar (horas huérfanas)
                  </div>
                )}
              </td>
              <td className="px-4 py-3.5 text-slate-600">
                <span className="block max-w-[14rem] truncate" title={r.area ?? "—"}>
                  {r.area ?? "—"}
                </span>
              </td>
              <td className="px-4 py-3.5 text-slate-600">
                <span className="block max-w-[12rem] truncate" title={r.managerName ?? "—"}>
                  {r.managerName ?? "—"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">
                <span className="text-slate-700">{r.weeklyOvertime.toFixed(1)}h</span>
                {r.weeklyHigh && (
                  <span
                    className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                    title="Semana por encima de 12h. Está permitido: el límite que cuenta es el mensual."
                  >
                    alta
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">
                <span className={monthlyClass(r.monthlyOvertime)}>
                  {r.monthlyOvertime.toFixed(1)}h
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-700">
                {r.availableMonthly.toFixed(1)}h
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm tabular-nums">
                <span className={r.willExceedMonthly ? "font-semibold text-status-red" : "text-slate-700"}>
                  ≈{r.projectedMonthlyOvertime.toFixed(0)}h
                </span>
                {r.willExceedMonthly && (
                  <span className="block text-xs font-medium text-status-red">
                    excede 48h
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge level={r.level} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
