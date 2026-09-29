import Link from "next/link";
import clsx from "clsx";
import type { EmployeeDetail as Detail } from "@/lib/aggregate";
import { fmtH, RULES } from "@/lib/overtime";
import { monthLabel } from "@/lib/dates";
import { LEVEL_LABELS, PendingIcon, StatusBadge } from "./StatusBadge";
import { PrintButton } from "./PrintButton";
import { FigureCluster } from "./brand/Figures";
import { CumulativeChart } from "./charts/CumulativeChart";

const LEVEL_CLS: Record<Detail["level"], string> = {
  red: "text-status-red",
  yellow: "text-status-yellow",
  green: "text-status-green",
};

/** Color del acumulado frente a la meta de su tramo (y al límite del mes). */
function accCls(acc: number, target: number): string {
  if (acc > RULES.MONTHLY_OVERTIME_LIMIT) return "text-status-red";
  if (Math.round(acc * 10) > Math.round(target * 10)) return "text-status-yellow";
  return "text-slate-700";
}

export function EmployeeDetailView({
  detail,
  backHref,
}: {
  detail: Detail;
  backHref: string;
}) {
  const d = detail;
  const p = d.period;
  const month = monthLabel(p.year, p.month);
  const closed = p.status === "cerrado";
  const statusLine =
    d.level === "red"
      ? `Superó el límite de ${RULES.MONTHLY_OVERTIME_LIMIT}h del mes`
      : d.risk === "meta"
        ? `${fmtH(d.overTarget)} por encima de la meta${p.cutoffLabel ? ` al ${p.cutoffLabel}` : ""}`
        : d.risk === "proyeccion"
          ? `Dentro de la meta, pero a este ritmo cerraría en ${fmtH(d.projectedMonthlyOvertime)}`
          : closed
            ? "Cerró el mes dentro del límite"
            : `Dentro de la meta${p.cutoffLabel ? ` al ${p.cutoffLabel}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="text-sm text-brand-dark underline-offset-2 hover:underline">
          ← Volver al dashboard
        </Link>
        <PrintButton label="Exportar ficha a PDF" />
      </div>

      {/* Cabecera / identidad */}
      <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-6 py-5">
        <FigureCluster />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-dark">
              {d.employee.name ?? d.employee.code}
            </h1>
            <StatusBadge level={d.level} pending={d.frozenCount} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {d.employee.roleTitle ?? "—"} · ID {d.employee.code} · {month}
            {p.cutoffLabel ? ` · datos hasta el ${p.cutoffLabel}` : " · sin datos cargados"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {d.employee.direccion && (
              <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">
                Dirección: <strong>{d.employee.direccion}</strong>
              </span>
            )}
            <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">
              Área: <strong>{d.employee.area ?? "—"}</strong>
            </span>
            {d.employee.plant && (
              <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">
                Planta: <strong>{d.employee.plant}</strong>
              </span>
            )}
            {d.employee.costCenter && (
              <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">
                Centro de costo: <strong>{d.employee.costCenter}</strong>
              </span>
            )}
            <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">
              Jefe/Supervisor: <strong>{d.employee.managerName ?? "Sin asignar"}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Estado del mes y cifras clave */}
      <section aria-labelledby="estado-mes" className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-1">
          <h2 id="estado-mes" className="text-sm font-medium text-slate-600">
            Estado del mes
          </h2>
          <p className={clsx("mt-1 text-2xl font-semibold", LEVEL_CLS[d.level])}>
            {LEVEL_LABELS[d.level]}
          </p>
          <p className="mt-1 text-sm text-slate-700">{statusLine}</p>
          {d.frozenCount > 0 && (
            <p className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-violet-50 px-2 py-1.5 text-xs text-violet-800">
              <PendingIcon className="mt-0.5" />
              <span>
                {d.frozenCount} registro{d.frozenCount > 1 ? "s" : ""} por revisar: el mes
                quedaría entre {fmtH(d.monthlyOvertime)} y {fmtH(d.potentialMonthlyOvertime)}.
              </span>
            </p>
          )}
        </div>
        <Metric
          label={`Acumulado${p.cutoffLabel ? ` al ${p.cutoffLabel}` : ""}`}
          value={fmtH(d.monthlyOvertime)}
          hint={`Meta a esa fecha: ${fmtH(d.target)} · límite del mes ${RULES.MONTHLY_OVERTIME_LIMIT}h`}
          tone={d.level}
        />
        <Metric
          label={closed ? "Cierre del mes" : "Proyección de cierre"}
          value={`${closed ? "" : "≈ "}${fmtH(d.projectedMonthlyOvertime)}`}
          hint={
            closed
              ? "Mes cerrado"
              : d.projectionReliable
                ? "Al ritmo diario que lleva"
                : "Estimación con pocos datos: no cambia el estado"
          }
          tone={!closed && d.projectedMonthlyOvertime > RULES.MONTHLY_OVERTIME_LIMIT ? "yellow" : undefined}
        />
      </section>

      {/* Curva acumulado vs meta */}
      <section className="card" aria-labelledby="curva">
        <h2 id="curva" className="text-lg font-semibold text-brand-dark">
          Acumulado frente a la meta · {month}
        </h2>
        <p className="mb-3 text-sm text-slate-600">
          La meta suma 12h por cada semana completa, la parte proporcional en las semanas
          parciales, y se detiene en {RULES.MONTHLY_OVERTIME_LIMIT}h.
        </p>
        <CumulativeChart
          segments={d.segments}
          daysInMonth={p.daysInMonth}
          cutoffDay={p.cutoffDay}
          monthLabel={month}
        />
      </section>

      {/* Semanas de más de 12h */}
      <section className="card" aria-labelledby="semanas-altas">
        <h2 id="semanas-altas" className="text-sm font-semibold text-brand-dark">
          Semanas de más de {RULES.WEEKLY_OVERTIME_LIMIT}h (lunes a domingo)
        </h2>
        {d.highWeeks.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">Ninguna en este mes.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {d.highWeeks.map((w) => (
              <li
                key={`${w.isoYear}-${w.week}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                title={w.shared ? "Semana compartida con otro mes" : undefined}
              >
                {w.label}: <strong className="tabular-nums">{fmtH(w.hours)}</strong>
                {w.shared && (
                  <span className="ml-1 text-xs text-slate-500">
                    · semana compartida{w.counted ? "" : ", se cuenta en el otro mes"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Es una alerta informativa: no cambia el estado del mes.
        </p>
      </section>

      {/* Cifras del mes */}
      <section aria-labelledby="cifras">
        <h2 id="cifras" className="mb-3 text-lg font-semibold text-brand-dark">
          Lo que lleva del mes
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Metric label="Horas extra" value={fmtH(d.monthlyOvertime)} />
          <Metric
            label="Horas base"
            value={d.baseHoursMonth != null ? fmtH(d.baseHoursMonth) : "—"}
            hint={d.baseHoursMonth == null ? "el archivo de novedades no las trae" : undefined}
          />
          <Metric
            label="Total trabajado"
            value={d.totalHoursMonth != null ? fmtH(d.totalHoursMonth) : "—"}
            hint={d.totalHoursMonth == null ? "el archivo de novedades no lo trae" : undefined}
          />
          {d.areaRankPosition && d.areaRankTotal ? (
            <Metric
              label="Posición en su área"
              value={`#${d.areaRankPosition} de ${d.areaRankTotal}`}
              hint="por horas extra del mes"
            />
          ) : (
            <Metric
              label="Tramos con horas extra"
              value={String(d.segmentsWithOvertime)}
            />
          )}
        </div>
      </section>

      {/* Recargos del mes (formato de novedades) */}
      {d.recargos && (
        <section aria-labelledby="recargos">
          <h2 id="recargos" className="mb-3 text-lg font-semibold text-brand-dark">
            Recargos del mes
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Extra diurna" value={fmtH(d.recargos.diurna)} />
            <Metric label="Extra nocturna" value={fmtH(d.recargos.nocturna)} />
            <Metric label="Dominical diurna" value={fmtH(d.recargos.dom_diurna)} />
            <Metric label="Dominical nocturna" value={fmtH(d.recargos.dom_nocturna)} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Clasificación según el archivo de novedades.
          </p>
        </section>
      )}

      {/* Historial por tramo */}
      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 text-lg font-semibold text-brand-dark">
          ¿Cuándo hizo esas horas?
        </h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Periodo</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Extra</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Acumulado del mes</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Meta a esa fecha</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                <th scope="col" className="px-4 py-3 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-600">
                    Sin registros cargados.
                  </td>
                </tr>
              )}
              {d.history.map((h) => (
                <tr
                  key={`${h.key}`}
                  className={clsx(h.hasError && !h.reviewStatus && "bg-violet-50", h.isCurrentMonth && "font-medium")}
                >
                  <th scope="row" className="px-4 py-2 text-left font-normal text-slate-800">
                    {h.label}
                    {h.year !== p.year && <span className="text-slate-500"> {h.year}</span>}
                    {h.estimated && (
                      <span
                        className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800"
                        title="Semana que cruza de mes sin detalle por día: horas repartidas por días"
                      >
                        estimado
                      </span>
                    )}
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                    {h.hasError ? <span className="text-xs text-slate-500">sin validar</span> : fmtH(h.overtimeHours)}
                  </td>
                  <td className={clsx("px-4 py-2 text-right font-semibold tabular-nums", accCls(h.monthToDate, h.targetToDate))}>
                    {fmtH(h.monthToDate)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">{fmtH(h.targetToDate)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {h.totalHours != null ? fmtH(h.totalHours) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {h.hasError && !h.reviewStatus ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700" title={h.errorReason}>
                        <PendingIcon /> Por revisar
                      </span>
                    ) : h.reviewStatus === "descartado" ? (
                      <span className="text-xs text-slate-600" title={h.errorReason}>Descartado</span>
                    ) : h.reviewStatus === "corregido" ? (
                      <span className="text-xs text-green-700">Corregido</span>
                    ) : (
                      <span className="text-xs text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          El color del acumulado compara con la meta a esa fecha: naranja por encima, rojo
          por encima de {RULES.MONTHLY_OVERTIME_LIMIT}h. «—»: el archivo de novedades solo trae
          horas extra, no horas totales.
        </p>
      </section>

      {d.reasons.length > 0 && (
        <section className="card" aria-labelledby="motivos">
          <h2 id="motivos" className="text-sm font-semibold text-brand-dark">
            Por qué está en este estado
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {d.reasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Detail["level"];
}) {
  return (
    <div className="card">
      <p className="min-h-[2.5rem] text-[13px] leading-snug text-slate-600">{label}</p>
      <p
        className={clsx(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "red" ? "text-status-red" : tone === "yellow" ? "text-status-yellow" : "text-brand-dark"
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
