import Link from "next/link";
import clsx from "clsx";
import type { EmployeeDetail as Detail } from "@/lib/aggregate";
import { RULES } from "@/lib/overtime";
import { StatusBadge } from "./StatusBadge";
import { BudgetBar } from "./BudgetBar";
import { PrintButton } from "./PrintButton";
import { FigureCluster } from "./brand/Figures";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const TREND: Record<Detail["trend"], { icon: string; label: string; cls: string }> = {
  up: { icon: "▲", label: "más que la semana previa", cls: "text-status-red" },
  down: { icon: "▼", label: "menos que la semana previa", cls: "text-status-green" },
  flat: { icon: "▬", label: "sin cambio", cls: "text-slate-400" },
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
              <StatusBadge level={d.level} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {d.employee.roleTitle ?? "—"} · ID {d.employee.code} ·{" "}
              {MONTHS[d.period.month - 1]} {d.period.year} (semana {d.period.week})
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">
                Área: <strong>{d.employee.area ?? "—"}</strong>
              </span>
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
            Horas extra disponibles este mes (límite legal 48h)
          </p>
          <div className="mt-3">
            <BudgetBar
              used={d.monthlyOvertime}
              limit={RULES.MONTHLY_OVERTIME_LIMIT}
              warning={RULES.MONTHLY_OVERTIME_WARNING}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Este es el límite que no puede superarse.
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-slate-600">
            Horas extra de la semana (referencia)
          </p>
          <div className="mt-3">
            <BudgetBar
              used={d.weeklyOvertime}
              limit={RULES.WEEKLY_OVERTIME_LIMIT}
              warning={RULES.WEEKLY_OVERTIME_WARNING}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Superar 12h en una semana está permitido; es solo informativo.
          </p>
        </div>
      </section>

      {/* Métricas del mes */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Extra del mes" value={`${d.extraHoursMonth.toFixed(1)}h`} />
        <Metric label="Horas base del mes" value={`${d.baseHoursMonth.toFixed(1)}h`} />
        <Metric label="Total trabajado (mes)" value={`${d.totalHoursMonth.toFixed(1)}h`} />
        <Metric
          label="Promedio extra/semana"
          value={`${d.avgWeeklyOvertime.toFixed(1)}h`}
          hint={`${d.weeksWorkedMonth} semanas`}
        />
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Tendencia semanal</p>
          <p className={clsx("mt-1 text-lg font-semibold", trend.cls)}>
            {trend.icon} {d.trendDelta > 0 ? "+" : ""}
            {d.trendDelta.toFixed(1)}h
          </p>
          <p className="text-xs text-slate-400">{trend.label}</p>
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
          <p className="text-xs text-slate-400">
            {d.willExceedMonthly ? "Superaría las 48h del mes" : "Dentro del límite mensual"}
          </p>
        </div>
        {d.areaRankPosition && d.areaRankTotal && (
          <div className="card">
            <p className="text-sm text-slate-500">Ranking en su área</p>
            <p className="mt-1 text-lg font-semibold text-brand-dark">
              #{d.areaRankPosition} de {d.areaRankTotal}
            </p>
            <p className="text-xs text-slate-400">por horas extra del mes</p>
          </div>
        )}
        <div className="card">
          <p className="text-sm text-slate-500">Cumplimiento legal</p>
          <p
            className={clsx(
              "mt-1 text-lg font-semibold",
              d.monthlyExceeded
                ? "text-status-red"
                : d.willExceedMonthly
                  ? "text-status-yellow"
                  : "text-status-green"
            )}
          >
            {d.monthlyExceeded
              ? "Excedido"
              : d.willExceedMonthly
                ? "En riesgo"
                : "En regla"}
          </p>
          <p className="text-xs text-slate-400">
            {d.frozenCount > 0 ? `${d.frozenCount} registro(s) por revisar` : "Sin novedades"}
          </p>
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
          <p className="mt-2 text-xs text-slate-400">
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
                <th className="px-4 py-3 font-medium">Corte</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.history.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Sin registros cargados.
                  </td>
                </tr>
              )}
              {d.history.map((h) => (
                <tr
                  key={`${h.year}-${h.week}`}
                  className={clsx(
                    h.hasError && "bg-amber-50",
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
                  <td className="px-4 py-2 text-right tabular-nums">{h.totalHours.toFixed(1)}h</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                    {h.baseHours.toFixed(1)}h
                  </td>
                  <td
                    className={clsx(
                      "px-4 py-2 text-right font-medium tabular-nums",
                      h.overtimeHours > RULES.WEEKLY_OVERTIME_LIMIT
                        ? "text-status-red"
                        : h.overtimeHours >= RULES.WEEKLY_OVERTIME_WARNING
                          ? "text-status-yellow"
                          : "text-slate-700"
                    )}
                  >
                    {h.overtimeHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {h.isPartial ? "Parcial" : "Final"}
                  </td>
                  <td className="px-4 py-2">
                    {h.hasError ? (
                      <span className="text-xs text-amber-700" title={h.errorReason}>
                        ⚠ Congelado
                      </span>
                    ) : (
                      <span className="text-xs text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Los datos del archivo biométrico son semanales (no hay marcación diaria).
          La franja diaria y el desglose diurno/nocturno permitirían mayor detalle.
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
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-brand-dark">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
