import Link from "next/link";
import clsx from "clsx";
import type { EmployeeDetail as Detail } from "@/lib/aggregate";
import { RULES } from "@/lib/overtime";
import { PendingIcon, StatusBadge } from "./StatusBadge";
import { BudgetBar } from "./BudgetBar";
import { PrintButton } from "./PrintButton";
import { FigureCluster } from "./brand/Figures";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Neutra: hacer más horas que la semana previa no incumple nada por sí solo.
const TREND: Record<Detail["trend"], { icon: string; label: string; cls: string }> = {
  up: { icon: "▲", label: "más que la semana previa", cls: "text-brand-dark" },
  down: { icon: "▼", label: "menos que la semana previa", cls: "text-brand-dark" },
  flat: { icon: "▬", label: "sin cambio", cls: "text-slate-600" },
};

/** Color del acumulado mensual según los umbrales del límite legal. */
function monthCls(h: number): string {
  if (h > RULES.MONTHLY_OVERTIME_LIMIT) return "text-status-red";
  if (h >= RULES.MONTHLY_OVERTIME_WARNING) return "text-status-yellow";
  return "text-slate-700";
}

const LEGAL: Record<Detail["level"], { label: string; cls: string }> = {
  red: { label: "Crítico", cls: "text-status-red" },
  yellow: { label: "Preventivo", cls: "text-status-yellow" },
  green: { label: "Normal", cls: "text-status-green" },
};

export function EmployeeDetailView({
  detail,
  backHref,
}: {
  detail: Detail;
  backHref: string;
}) {
  const d = detail;
  const trend = TREND[d.trend];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="text-sm text-brand hover:text-brand-dark">
          ← Volver al dashboard
        </Link>
        <PrintButton label="Exportar ficha a PDF" />
      </div>

      {/* Cabecera / identidad */}
      <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-6 py-5">
        <FigureCluster />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-brand-dark">
                {d.employee.name ?? d.employee.code}
              </h1>
              <StatusBadge level={d.level} pending={d.frozenCount} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {d.employee.roleTitle ?? "—"} · ID {d.employee.code} ·{" "}
              {MONTHS[d.period.month - 1]} {d.period.year} (semana {d.period.week})
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
        </div>
        {d.reasons.length > 0 && (
          <ul className="relative mt-4 space-y-1 text-sm text-slate-600">
            {d.reasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        )}
      </header>

      {/* Horas disponibles — el límite DURO es el mensual */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card border-brand/30">
          <p className="text-sm font-medium text-brand-dark">
            {d.monthlyExceeded
              ? `Límite mensual superado (${RULES.MONTHLY_OVERTIME_LIMIT}h)`
              : `Horas extra disponibles este mes (límite legal ${RULES.MONTHLY_OVERTIME_LIMIT}h)`}
          </p>
          <div className="mt-3">
            <BudgetBar
              used={d.monthlyOvertime}
              limit={RULES.MONTHLY_OVERTIME_LIMIT}
              warning={RULES.MONTHLY_OVERTIME_WARNING}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Este es el límite que no puede superarse.
          </p>
          {d.frozenCount > 0 && (
            <p className="mt-2 rounded-md bg-violet-50 px-2 py-1.5 text-xs text-violet-800">
              {d.frozenCount} registro{d.frozenCount > 1 ? "s" : ""} por revisar: según
              se resuelva{d.frozenCount > 1 ? "n" : ""}, el mes quedaría entre{" "}
              {d.monthlyOvertime.toFixed(1)}h y ≈{d.potentialMonthlyOvertime.toFixed(1)}h.
            </p>
          )}
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-600">
            Horas extra de la semana {d.period.week} (referencia{" "}
            {RULES.WEEKLY_OVERTIME_LIMIT}h)
          </p>
          <div className="mt-3">
            <BudgetBar
              used={d.weeklyOvertime}
              limit={RULES.WEEKLY_OVERTIME_LIMIT}
              warning={RULES.WEEKLY_OVERTIME_WARNING}
              mode="reference"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {d.highWeeksMonth > 0
              ? `${d.highWeeksMonth} semana${d.highWeeksMonth > 1 ? "s" : ""} de más de ${RULES.WEEKLY_OVERTIME_LIMIT}h este mes. Está permitido; solo cuenta el total del mes.`
              : `Superar ${RULES.WEEKLY_OVERTIME_LIMIT}h en una semana está permitido; solo cuenta el total del mes.`}
          </p>
        </div>
      </section>

      {/* Métricas del mes */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          Lo que lleva del mes
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Metric label="Extra del mes" value={`${d.extraHoursMonth.toFixed(1)}h`} />
          <Metric
            label="Horas base"
            value={d.baseHoursMonth != null ? `${d.baseHoursMonth.toFixed(1)}h` : "—"}
            hint={d.baseHoursMonth == null ? "el archivo de novedades no las trae" : undefined}
          />
          <Metric
            label="Total trabajado"
            value={d.totalHoursMonth != null ? `${d.totalHoursMonth.toFixed(1)}h` : "—"}
            hint={d.totalHoursMonth == null ? "el archivo de novedades no lo trae" : undefined}
          />
          <Metric
            label="Promedio semanal"
            value={`${d.avgWeeklyOvertime.toFixed(1)}h`}
            hint={`${d.weeksWorkedMonth} semana${d.weeksWorkedMonth === 1 ? "" : "s"} con registro`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          Cómo va a cerrar el mes
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Tendencia semanal</p>
          <p className={clsx("mt-1 text-lg font-semibold", trend.cls)}>
            {trend.icon} {d.trendDelta > 0 ? "+" : ""}
            {d.trendDelta.toFixed(1)}h
          </p>
          <p className="text-xs text-slate-500">{trend.label}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Proyección de cierre de mes</p>
          <p
            className={clsx(
              "mt-1 text-lg font-semibold",
              d.willExceedMonthly ? "text-status-red" : "text-brand-dark"
            )}
          >
            ≈ {d.projectedMonthlyOvertime.toFixed(1)}h
          </p>
          <p className="text-xs text-slate-500">
            {d.willExceedMonthly ? "Superaría las 48h del mes" : "Dentro del límite mensual"}
          </p>
        </div>
        {d.areaRankPosition && d.areaRankTotal && (
          <div className="card">
            <p className="text-sm text-slate-500">Ranking en su área</p>
            <p className="mt-1 text-lg font-semibold text-brand-dark">
              #{d.areaRankPosition} de {d.areaRankTotal}
            </p>
            <p className="text-xs text-slate-500">por horas extra del mes</p>
          </div>
        )}
        <div className="card">
          <p className="text-sm text-slate-500">Estado frente al límite mensual</p>
          <p className={clsx("mt-1 text-lg font-semibold", LEGAL[d.level].cls)}>
            {LEGAL[d.level].label}
            {d.level === "red" && " · superó 48h"}
            {d.level === "yellow" &&
              (d.monthlyOvertime >= RULES.MONTHLY_OVERTIME_WARNING
                ? " · cerca de 48h"
                : " · por proyección")}
          </p>
          <p
            className={clsx(
              "text-xs",
              d.frozenCount > 0 ? "font-medium text-violet-700" : "text-slate-500"
            )}
          >
            {d.frozenCount === 1
              ? "1 registro por revisar"
              : `${d.frozenCount} registros por revisar`}
          </p>
        </div>
        </div>
      </section>

      {/* Desglose de recargos del mes (formato real) */}
      {d.recargos && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-dark">
            Recargos del mes
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Extra diurna" value={`${d.recargos.diurna.toFixed(1)}h`} />
            <Metric label="Extra nocturna" value={`${d.recargos.nocturna.toFixed(1)}h`} />
            <Metric label="Dominical diurna" value={`${d.recargos.dom_diurna.toFixed(1)}h`} />
            <Metric label="Dominical nocturna" value={`${d.recargos.dom_nocturna.toFixed(1)}h`} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Clasificación según el archivo de novedades. Base para el cálculo de
            recargos de ley (25% / 75% / dominical).
          </p>
        </section>
      )}

      {/* Cuándo hizo esas horas: historial semanal */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          ¿Cuándo hizo esas horas? — Historial semanal
        </h2>
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Semana ISO</th>
                <th className="px-4 py-3 font-medium">Mes</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Base</th>
                <th className="px-4 py-3 text-right font-medium">Extra</th>
                <th className="px-4 py-3 text-right font-medium">
                  <abbr title="Horas extra válidas acumuladas en el mes hasta esa semana; se colorea frente al límite de 48h" className="no-underline">
                    Acumulado del mes
                  </abbr>
                </th>
                <th className="px-4 py-3 font-medium">Corte</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.history.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    Sin registros cargados.
                  </td>
                </tr>
              )}
              {d.history.map((h) => (
                <tr
                  key={`${h.year}-${h.week}`}
                  className={clsx(
                    h.hasError && !h.reviewStatus && "bg-violet-50",
                    h.week === d.period.week && h.isCurrentMonth && "bg-brand-tint"
                  )}
                >
                  <td className="px-4 py-2 font-medium text-slate-700">
                    Semana {h.week}
                    {h.week === d.period.week && h.isCurrentMonth && (
                      <span className="ml-2 text-xs text-brand">(actual)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{MONTHS[h.month - 1]}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {h.totalHours != null ? `${h.totalHours.toFixed(1)}h` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                    {h.baseHours != null ? `${h.baseHours.toFixed(1)}h` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-700">
                    {h.hasError ? (
                      <span className="text-xs font-normal text-slate-500">sin validar</span>
                    ) : (
                      <>
                        {h.overtimeHours.toFixed(1)}h
                        {h.overtimeHours > RULES.WEEKLY_OVERTIME_LIMIT && (
                          <span
                            className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[11px] font-normal text-slate-600"
                            title={`Más de ${RULES.WEEKLY_OVERTIME_LIMIT}h en la semana: permitido, informativo`}
                          >
                            &gt;{RULES.WEEKLY_OVERTIME_LIMIT}h
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td
                    className={clsx(
                      "px-4 py-2 text-right font-semibold tabular-nums",
                      monthCls(h.monthToDate)
                    )}
                  >
                    {h.monthToDate.toFixed(1)}h
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {h.isPartial ? "Parcial" : "Final"}
                  </td>
                  <td className="px-4 py-2">
                    {h.hasError && !h.reviewStatus ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-violet-700"
                        title={h.errorReason}
                      >
                        <PendingIcon /> Por revisar
                      </span>
                    ) : h.reviewStatus === "descartado" ? (
                      <span className="text-xs text-slate-500" title={h.errorReason}>
                        Descartado
                      </span>
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
          «Extra» es informativo por semana; el color del «Acumulado del mes» es el
          que cuenta frente al límite legal de {RULES.MONTHLY_OVERTIME_LIMIT}h. «—»:
          el archivo de novedades solo trae horas extra, no horas totales.
        </p>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="min-h-[2.5rem] text-[13px] leading-snug text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-dark">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
