"use client";

import clsx from "clsx";
import { StatusBadge } from "./StatusBadge";
import { EmployeeLink } from "./drawer/EmployeeLink";
import { useDrawer } from "./drawer/context";
import type { EmployeeStatus } from "@/lib/aggregate";
import { fmtH, RULES } from "@/lib/overtime";

/** Color del acumulado: rojo sobre 48h, naranja sobre la meta a la fecha. */
function accClass(r: EmployeeStatus): string {
  if (r.level === "red") return "font-semibold text-status-red";
  if (r.risk === "meta") return "font-semibold text-status-yellow";
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
  const drawer = useDrawer();
  const openRow = (id: string) => drawer?.open({ kind: "employee", id });
  const linkFor = (id: string) => {
    if (!hrefBase) return undefined;
    const qs = [query, roleParam ? `rol=${roleParam}` : ""].filter(Boolean).join("&");
    return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
  };

  if (rows.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-sm font-medium text-brand-dark">Sin resultados</p>
        <p className="mt-1 text-sm text-slate-600">
          Ninguna persona coincide con los filtros de este periodo. Quite algún filtro para
          ampliar la búsqueda.
        </p>
      </div>
    );
  }

  const name = (r: EmployeeStatus, cls: string) =>
    linkFor(r.id) ? (
      <EmployeeLink id={r.id} href={linkFor(r.id)} className={cls}>
        {r.name ?? r.code}
      </EmployeeLink>
    ) : (
      <span className={cls}>{r.name ?? r.code}</span>
    );

  return (
    <div className="card overflow-hidden p-0 sm:overflow-x-auto">
      {/* Teléfono: una tarjeta por persona. */}
      <ul className="divide-y divide-slate-100 sm:hidden">
        {rows.map((r) => (
          <li
            key={r.id}
            onClick={() => openRow(r.id)}
            className={clsx("px-4 py-3 transition", drawer && "cursor-pointer hover:bg-slate-50")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {name(r, "block truncate font-medium text-brand-dark underline-offset-2 hover:underline")}
                <span className="block truncate text-[13px] text-slate-600">
                  {r.code}
                  {r.area ? ` · ${r.area}` : ""}
                </span>
              </div>
              <StatusBadge level={r.level} pending={r.pendingReviewCount} />
            </div>
            <dl className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-slate-500">Acumulado</dt>
                <dd className={clsx("text-sm tabular-nums", accClass(r))}>{fmtH(r.monthlyOvertime)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Meta a la fecha</dt>
                <dd className="text-sm tabular-nums text-slate-700">{fmtH(r.target)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Proyección</dt>
                <dd
                  className={clsx(
                    "text-sm font-semibold tabular-nums",
                    r.willExceedMonthly ? "text-status-yellow" : "text-slate-700"
                  )}
                >
                  ≈{fmtH(r.projectedMonthlyOvertime)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Escritorio: el estado va primero para que siempre se vea. */}
      <table className="hidden min-w-full divide-y divide-slate-200 text-sm sm:table">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="th">Estado</th>
            <th scope="col" className="th">Persona</th>
            <th scope="col" className="th">Área · Jefe</th>
            <th scope="col" className="th-num">Acumulado</th>
            <th scope="col" className="th-num">Meta a la fecha</th>
            <th scope="col" className="th-num">Sobre la meta</th>
            <th scope="col" className="th-num">Sem. &gt; {RULES.WEEKLY_OVERTIME_LIMIT}h</th>
            <th scope="col" className="th-num">Proyección</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => openRow(r.id)}
              className={clsx("transition-colors hover:bg-slate-50", drawer && "cursor-pointer")}
            >
              <td className="px-4 py-3.5">
                <StatusBadge level={r.level} pending={r.pendingReviewCount} />
              </td>
              <td className="min-w-[11rem] px-4 py-3.5">
                {name(r, "font-medium text-brand-dark underline-offset-2 hover:underline")}
                <div className="text-[13px] text-slate-600">
                  {r.code}
                  {r.roleTitle ? ` · ${r.roleTitle}` : ""}
                </div>
              </td>
              <td className="px-4 py-3.5 text-slate-600">
                <span className="block max-w-[12rem] truncate" title={r.area ?? "—"}>
                  {r.area ?? "—"}
                </span>
                <span className="block max-w-[14rem] truncate text-[13px] text-slate-500" title={r.managerName ?? "—"}>
                  {r.managerName ?? "—"}
                </span>
              </td>
              <td className={clsx("whitespace-nowrap px-4 py-3.5 text-right tabular-nums", accClass(r))}>
                {fmtH(r.monthlyOvertime)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-600">
                {fmtH(r.target)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">
                {r.overTarget > 0 ? (
                  <span className="font-semibold text-status-yellow">+{fmtH(r.overTarget)}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-700">
                {r.highWeeksMonth > 0 ? r.highWeeksMonth : <span className="text-slate-400">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">
                <span className={r.willExceedMonthly ? "font-semibold text-status-yellow" : "text-slate-700"}>
                  ≈{fmtH(r.projectedMonthlyOvertime)}
                </span>
                {r.risk === "proyeccion" && (
                  <span className="block text-xs font-medium text-status-yellow">pasaría de 48h</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
