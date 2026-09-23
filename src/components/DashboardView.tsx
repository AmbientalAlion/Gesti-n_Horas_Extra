import { StatCard } from "./StatCard";
import { FilterableEmployeeTable } from "./FilterableEmployeeTable";
import { EmployeeSearch } from "./EmployeeSearch";
import { CollapsibleCard } from "./CollapsibleCard";
import { DonutChart } from "./charts/DonutChart";
import { TrendChart } from "./charts/TrendChart";
import { HBarChart } from "./charts/HBarChart";
import { Heatmap } from "./charts/Heatmap";
import { StatusBadge } from "./StatusBadge";
import { DashboardFilters } from "./DashboardFilters";
import { FigureCluster } from "./brand/Figures";
import { RULES } from "@/lib/overtime";
import type { Role } from "@/lib/types";
import type {
  DashboardCharts,
  EmployeeStatus,
  Filters,
  FilterOptions,
  Period,
  PlantSummary,
} from "@/lib/aggregate";

const ROLE_FOCUS: Record<Role | "demo", { tag: string; focus: string }> = {
  rrhh: {
    tag: "Recursos Humanos",
    focus:
      "Vista global de la planta: cumplimiento legal del mes y cargas por dirección, área y sede.",
  },
  director: {
    tag: "Dirección de planta",
    focus:
      "Comparativo por sede y dirección, proyección de cierre de mes y solicitudes por aprobar.",
  },
  jefe: {
    tag: "Jefe inmediato",
    focus:
      "Su equipo: quién se acerca al límite mensual y quién tiene horas disponibles para turnos.",
  },
  demo: {
    tag: "Demostración",
    focus:
      "Explore la herramienta cambiando de rol y filtrando por planta, dirección, área o jefe.",
  },
};

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
  role = "demo",
  toolbar,
  filterOptions,
  filters,
}: {
  statuses: EmployeeStatus[];
  summary: PlantSummary;
  charts: DashboardCharts;
  period: Period;
  scopeLabel: string;
  hrefBase: string;
  roleParam?: string;
  role?: Role | "demo";
  toolbar?: React.ReactNode;
  filterOptions?: FilterOptions;
  filters?: Filters;
}) {
  const critical = statuses
    .filter((s) => s.level === "red")
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);

  // Proyección de cierre de mes: quién superará las 48h (aún no en rojo).
  const atRisk = statuses
    .filter((s) => s.level !== "red" && s.willExceedMonthly)
    .sort((a, b) => b.projectedMonthlyOvertime - a.projectedMonthlyOvertime);

  // Rotación equitativa: más horas disponibles = mejores candidatos a turnos.
  const rotation = statuses
    .filter((s) => !s.hasError && s.level !== "red")
    .sort((a, b) => b.availableMonthly - a.availableMonthly)
    .slice(0, 6);

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
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-2">
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {ROLE_FOCUS[role].tag}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-brand-dark">Panel de control</h1>
            <p className="text-sm text-slate-500">
              {scopeLabel} · Semana {period.week} · {MONTHS[period.month - 1]}{" "}
              {period.year}
            </p>
            <p className="mt-1 max-w-xl text-xs text-slate-500">{ROLE_FOCUS[role].focus}</p>
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      </header>

      {/* Buscador rápido de empleados (typeahead). */}
      <EmployeeSearch rows={statuses} hrefBase={hrefBase} roleParam={roleParam} />

      {filterOptions && filters && (
        <DashboardFilters options={filterOptions} current={filters} />
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Empleados" value={summary.totalEmployees} />
        <StatCard
          label="🔴 Excede el mes"
          value={summary.red}
          tone="red"
          hint="> 48h extra"
        />
        <StatCard
          label="En riesgo (proyección)"
          value={summary.atRiskMonthly}
          tone={summary.atRiskMonthly > 0 ? "yellow" : "default"}
          hint="superaría 48h"
        />
        <StatCard
          label="Horas extra (mes)"
          value={`${summary.totalMonthlyOvertime.toFixed(0)}h`}
        />
        <StatCard
          label="Semanas altas"
          value={summary.weeklyHigh}
          hint="> 12h (permitido)"
        />
        <StatCard
          label="Registros con error"
          value={summary.withErrors}
          tone={summary.withErrors > 0 ? "yellow" : "default"}
        />
      </section>

      {/* Gráficos */}
      <CollapsibleCard
        title="Gráficos y distribución"
        subtitle="Toca una barra de área, planta o dirección para filtrar el panel completo."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-4 text-sm font-semibold text-brand-dark">
              Distribución del estado
            </h3>
            <DonutChart
              centerLabel="empleados"
              segments={[
                { label: "Normal", value: summary.green, color: "#16a34a" },
                { label: "Preventivo", value: summary.yellow, color: "#FF8400" },
                { label: "Crítico", value: summary.red, color: "#dc2626" },
              ]}
            />
          </div>

          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-1 text-sm font-semibold text-brand-dark">
              Horas extra por semana
            </h3>
            <p className="mb-3 text-xs text-slate-400">
              Total del alcance · consumo del límite legal ≈{" "}
              {avgConsumption.toFixed(0)}% del presupuesto mensual
            </p>
            <TrendChart
              points={charts.weeklyTrend.map((w) => ({
                label: `Sem ${w.week}`,
                value: w.overtime,
              }))}
            />
          </div>

          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-4 text-sm font-semibold text-brand-dark">
              Horas extra por área <span className="font-normal text-slate-400">· toca para filtrar</span>
            </h3>
            <HBarChart
              drill={{ param: "area", clear: ["ceco"] }}
              items={charts.byArea.map((a) => ({
                label: a.area,
                value: a.overtime,
                sublabel: `${a.count} pers.${a.red ? ` · ${a.red} crítico` : ""}`,
              }))}
            />
          </div>

          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-4 text-sm font-semibold text-brand-dark">
              Top empleados por horas extra
            </h3>
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

          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-4 text-sm font-semibold text-brand-dark">
              Horas extra por planta <span className="font-normal text-slate-400">· toca para filtrar</span>
            </h3>
            <HBarChart
              color="#00CBBF"
              drill={{ param: "planta", clear: ["direccion", "area", "ceco", "jefe"] }}
              items={charts.byPlant.map((g) => ({
                label: g.label,
                value: g.overtime,
                sublabel: `${g.count} pers.${g.red ? ` · ${g.red} crítico` : ""}`,
              }))}
            />
          </div>

          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-4 text-sm font-semibold text-brand-dark">
              Horas extra por dirección <span className="font-normal text-slate-400">· toca para filtrar</span>
            </h3>
            <HBarChart
              color="#003865"
              drill={{ param: "direccion", clear: ["area", "ceco", "jefe"] }}
              items={charts.byDireccion.map((g) => ({
                label: g.label,
                value: g.overtime,
                sublabel: `${g.count} pers.${g.red ? ` · ${g.red} crítico` : ""}`,
              }))}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Heatmap área × semana */}
      <CollapsibleCard
        title="Mapa de calor · horas extra por área y semana"
        subtitle="Más oscuro = más horas. Desplácese en horizontal para ver todas las semanas."
        defaultOpen={false}
      >
        <Heatmap data={charts.heatmap} />
      </CollapsibleCard>

      {/* Proyección de cierre + reincidentes */}
      <CollapsibleCard
        title="Proyección de cierre y reincidentes"
        subtitle="Quién superaría las 48h del mes y quién repite semanas altas."
        defaultOpen={false}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-3 text-sm font-semibold text-brand-dark">
              En riesgo de superar 48h
            </h3>
            {atRisk.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                Ningún empleado proyecta superar el límite mensual.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {atRisk.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-2.5">
                    <a
                      href={empLink(s.id)}
                      className="min-w-0 truncate font-medium text-brand-dark hover:underline"
                    >
                      {s.name ?? s.code}
                    </a>
                    <span className="hidden truncate text-xs text-slate-400 sm:block">
                      {s.area}
                    </span>
                    <span className="ml-auto shrink-0 tabular-nums text-slate-600">
                      {s.monthlyOvertime.toFixed(0)}h →{" "}
                      <span className="font-semibold text-status-yellow">
                        ≈{s.projectedMonthlyOvertime.toFixed(0)}h
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="mb-3 text-sm font-semibold text-brand-dark">
              Reincidentes · 2+ semanas por encima de 12h
            </h3>
            {charts.reincidentes.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                Sin reincidentes este mes.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {charts.reincidentes.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-2.5">
                    <a
                      href={empLink(r.id)}
                      className="min-w-0 truncate font-medium text-brand-dark hover:underline"
                    >
                      {r.name}
                    </a>
                    <StatusBadge level={r.level} />
                    <span className="ml-auto shrink-0 text-xs font-medium text-slate-600">
                      {r.weeksHigh} semanas altas
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* Rotación equitativa */}
      <CollapsibleCard
        title="Rotación equitativa · candidatos con más horas disponibles"
        subtitle="Sugerencia para repartir turnos sin acercar a nadie al límite mensual."
        defaultOpen={false}
      >
        {rotation.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Sin candidatos.</p>
        ) : (
          <HBarChart
            unit="h"
            color="#00CBBF"
            items={rotation.map((s) => ({
              label: s.name ?? s.code,
              value: s.availableMonthly,
              level: s.level,
              sublabel: `${s.area ?? "—"} · disponible`,
              href: empLink(s.id),
            }))}
          />
        )}
      </CollapsibleCard>

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

      <CollapsibleCard
        title="Detalle por empleado"
        subtitle="Busque, filtre por estado y abra la ficha de cada persona."
        badge={
          <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-brand-dark">
            {statuses.length} personas
          </span>
        }
      >
        <FilterableEmployeeTable
          rows={statuses}
          hrefBase={hrefBase}
          roleParam={roleParam}
        />
      </CollapsibleCard>
    </div>
  );
}
