import { StatCard } from "./StatCard";
import { EmployeeTable } from "./EmployeeTable";
import { DonutChart } from "./charts/DonutChart";
import { TrendChart } from "./charts/TrendChart";
import { HBarChart } from "./charts/HBarChart";
import { FigureCluster } from "./brand/Figures";
import { RULES } from "@/lib/overtime";
import type { DashboardCharts, EmployeeStatus, Period, PlantSummary } from "@/lib/aggregate";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function DashboardView({
  statuses,
  summary,
  charts,
  period,
  scopeLabel,
  hrefBase,
  roleParam,
}: {
  statuses: EmployeeStatus[];
  summary: PlantSummary;
  charts: DashboardCharts;
  period: Period;
  scopeLabel: string;
  hrefBase: string;
  roleParam?: string;
}) {
  const critical = statuses
    .filter((s) => s.level === "red")
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);

  const avgConsumption =
    summary.totalEmployees > 0
      ? (summary.totalMonthlyOvertime /
          (summary.totalEmployees * RULES.MONTHLY_OVERTIME_LIMIT)) *
        100
      : 0;

  const empLink = (id: string) =>
    `${hrefBase}/${id}${roleParam ? `?rol=${roleParam}` : ""}`;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-6 py-5">
        <FigureCluster />
        <div className="relative">
          <h1 className="text-2xl font-bold text-brand-dark">Panel de control</h1>
          <p className="text-sm text-slate-500">
            {scopeLabel} · Semana {period.week} · {MONTHS[period.month - 1]}{" "}
            {period.year}
          </p>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Empleados" value={summary.totalEmployees} />
        <StatCard label="🔴 En crítico" value={summary.red} tone="red" />
        <StatCard label="🟡 Preventivo" value={summary.yellow} tone="yellow" />
        <StatCard
          label="Alertas semanales"
          value={summary.weeklyAlerts}
          tone={summary.weeklyAlerts > 0 ? "red" : "default"}
        />
        <StatCard
          label="Horas extra (mes)"
          value={`${summary.totalMonthlyOvertime.toFixed(0)}h`}
        />
        <StatCard
          label="Registros con error"
          value={summary.withErrors}
          tone={summary.withErrors > 0 ? "yellow" : "default"}
        />
      </section>

      {/* Gráficos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-brand-dark">
            Distribución del estado
          </h2>
          <DonutChart
            centerLabel="empleados"
            segments={[
              { label: "Normal", value: summary.green, color: "#16a34a" },
              { label: "Preventivo", value: summary.yellow, color: "#FF8400" },
              { label: "Crítico", value: summary.red, color: "#dc2626" },
            ]}
          />
        </div>

        <div className="card">
          <h2 className="mb-1 text-sm font-semibold text-brand-dark">
            Horas extra por semana
          </h2>
          <p className="mb-2 text-xs text-slate-400">
            Total del alcance · consumo del límite legal ≈ {avgConsumption.toFixed(0)}%
            del presupuesto mensual
          </p>
          <TrendChart
            points={charts.weeklyTrend.map((w) => ({
              label: `Sem ${w.week}`,
              value: w.overtime,
            }))}
          />
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-brand-dark">
            Horas extra por área
          </h2>
          <HBarChart
            items={charts.byArea.map((a) => ({
              label: a.area,
              value: a.overtime,
              sublabel: `${a.count} pers.${a.red ? ` · ${a.red} crítico` : ""}`,
            }))}
          />
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-brand-dark">
            Top empleados por horas extra
          </h2>
          <HBarChart
            items={charts.topEmployees.map((t) => ({
              label: t.name,
              value: t.overtime,
              level: t.level,
              sublabel: t.area,
              href: empLink(t.id),
            }))}
          />
        </div>
      </section>

      {critical.length > 0 && (
        <section className="card border-red-200 bg-red-50">
          <h2 className="text-sm font-semibold text-red-800">
            Alertas críticas ({critical.length})
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {critical.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.name ?? s.code}</span>:{" "}
                {s.reasons.join(" ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          Detalle por empleado
        </h2>
        <EmployeeTable rows={statuses} hrefBase={hrefBase} roleParam={roleParam} />
      </section>
    </div>
  );
}
