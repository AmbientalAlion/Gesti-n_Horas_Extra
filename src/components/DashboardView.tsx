import { KpiCard } from "./KpiCard";
import { AlertsCenter } from "./AlertsCenter";
import { LegendStrip } from "./LegendStrip";
import { DrawerProvider } from "./drawer/DrawerProvider";
import { EmployeeLink } from "./drawer/EmployeeLink";
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
import { fmtH, monthlyTarget, RULES } from "@/lib/overtime";
import { daysInMonth as monthDays, formatDayLong, monthLabel } from "@/lib/dates";
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
      "Toda la organización: quién va por encima de la meta del mes, quién superó 48h y qué registros hay que revisar.",
  },
  director: {
    tag: "Director",
    focus:
      "Su dirección: quién va por encima de la meta, cómo cerraría el mes y en qué áreas se concentran las horas.",
  },
  jefe: {
    tag: "Jefe inmediato",
    focus: "Su equipo directo: quién va por encima de la meta del mes y quién está cerca de 48h.",
  },
  demo: {
    tag: "Demostración",
    focus:
      "Explore la herramienta cambiando de rol y filtrando por planta, dirección, área o jefe.",
  },
};

/** Datos del mes que se muestran en la cabecera y usa el panel lateral. */
function periodInfo(period: Period) {
  const days = period.daysInMonth ?? monthDays(period.year, period.month);
  const cutoff = period.cutoffDay ?? 0;
  const cutoffLabel =
    cutoff > 0 ? formatDayLong({ y: period.year, m: period.month, d: cutoff }) : null;
  const month = monthLabel(period.year, period.month);
  let main = month;
  if (period.status === "futuro") main += " · el mes aún no empieza";
  else if (!cutoffLabel) main += " · sin datos cargados";
  else {
    main += period.status === "cerrado" ? " · mes cerrado" : "";
    main += ` · datos hasta el ${cutoffLabel} · meta a esa fecha ${fmtH(monthlyTarget(cutoff))}`;
  }
  return {
    main,
    drawer: {
      daysInMonth: days,
      cutoffDay: cutoff,
      monthLabel: month,
      cutoffLabel,
      closed: period.status === "cerrado",
    },
  };
}

/** «12 pers. · 1 excedido · 2 en riesgo · 6,5h/pers.» */
function groupSub(g: { count: number; red: number; yellow: number; perPerson: number }): string {
  return [
    `${g.count} pers.`,
    g.red ? `${g.red} excedido${g.red > 1 ? "s" : ""}` : "",
    g.yellow ? `${g.yellow} en riesgo` : "",
    `${fmtH(g.perPerson)}/pers.`,
  ]
    .filter(Boolean)
    .join(" · ");
}

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
  query,
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
  /** Query string vigente (filtros y mes), para no perder el contexto. */
  query?: string;
}) {
  const info = periodInfo(period);
  const noData = info.drawer.cutoffDay === 0;
  // En riesgo, primero quien más se pasa de la meta; luego por proyección.
  const atRisk = statuses
    .filter((s) => s.level === "yellow")
    .sort((a, b) => b.overTarget - a.overTarget || b.projectedMonthlyOvertime - a.projectedMonthlyOvertime);

  // Los enlaces a la ficha arrastran los filtros vigentes para poder volver
  // al panel exactamente como estaba.
  const empLink = (id: string) => {
    const qs = [query, roleParam ? `rol=${roleParam}` : ""].filter(Boolean).join("&");
    return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <DrawerProvider
      statuses={statuses}
      segmentsByEmployee={charts.segmentsByEmployee}
      period={info.drawer}
      hrefBase={hrefBase}
      roleParam={roleParam}
      query={query}
    >
      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 motion-safe:animate-fade-in sm:px-6 sm:py-5">
          <FigureCluster />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 inline-flex items-center gap-2">
                <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {ROLE_FOCUS[role].tag}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-brand-dark">Panel de control</h1>
              <p className="text-sm text-slate-600">
                {scopeLabel} · {info.main}
              </p>
              <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed text-slate-600">
                {ROLE_FOCUS[role].focus}
              </p>
            </div>
            {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
          </div>
        </header>

        {/* Cómo leer el panel: la regla que manda y los estados como accesos directos. */}
        <LegendStrip
          counts={{ green: summary.green, yellow: summary.yellow, red: summary.red }}
        />

        {/* Buscador rápido de empleados (typeahead). */}
        <EmployeeSearch
          rows={statuses}
          hrefBase={hrefBase}
          roleParam={roleParam}
          query={query}
        />

        {filterOptions && filters && (
          <DashboardFilters options={filterOptions} current={filters} />
        )}

        {noData && (
          <div className="card text-center">
            <p className="text-sm font-medium text-brand-dark">Sin datos cargados para este mes</p>
            <p className="mt-1 text-sm text-slate-600">
              Cuando Recursos Humanos cargue el archivo del biométrico, aquí aparecerán el
              acumulado, la meta y las alertas.
            </p>
          </div>
        )}

        {/* KPIs: cada uno abre a la derecha la lista de personas que lo componen. */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Personas en riesgo"
            value={summary.yellow}
            tone={summary.yellow > 0 ? "yellow" : "default"}
            hint={
              summary.yellow > 0
                ? `${summary.riskByTarget} sobre la meta · ${summary.riskByProjection} por proyección`
                : "Nadie va por encima de la meta"
            }
            segment="yellow"
            delay={0}
          />
          <KpiCard
            label={`Excedieron ${RULES.MONTHLY_OVERTIME_LIMIT}h`}
            value={summary.red}
            tone={summary.red > 0 ? "red" : "default"}
            hint={`Más de ${RULES.MONTHLY_OVERTIME_LIMIT}h extra en el mes`}
            segment="red"
            delay={50}
          />
          <KpiCard
            label="Horas extra del mes"
            value={fmtH(summary.totalMonthlyOvertime)}
            hint={`${summary.totalEmployees} persona${summary.totalEmployees === 1 ? "" : "s"} en la vista`}
            segment="all"
            delay={100}
          />
          <KpiCard
            label={`Semanas por encima de ${RULES.WEEKLY_OVERTIME_LIMIT}h`}
            value={summary.weeklyHigh}
            hint={
              summary.weeklyHigh > 0
                ? `De ${summary.weeklyHighPeople} persona${summary.weeklyHighPeople === 1 ? "" : "s"} · lunes a domingo · informativo`
                : "Lunes a domingo · informativo"
            }
            segment="weeklyHigh"
            delay={150}
          />
          <KpiCard
            label="Registros por revisar"
            value={summary.withErrors}
            tone={summary.withErrors > 0 ? "violet" : "default"}
            hint="Turnos de más de 16h sin salida, congelados"
            segment="errors"
            delay={200}
          />
        </section>

        {/* Centro de alertas: cada alerta es una fila desplegable. */}
        <AlertsCenter
          delay={300}
          reviewHref={
            role === "rrhh" || role === "demo"
              ? `${hrefBase.replace(/\/empleado$/, "/revisiones")}${roleParam ? `?rol=${roleParam}` : ""}`
              : undefined
          }
        />

        {/* Gráficos */}
        <CollapsibleCard
          title="Gráficos y distribución"
          subtitle="Toque cualquier barra, estado o persona: el detalle se abre a la derecha."
          delay={350}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-100 p-4">
              <h3 className="mb-4 text-sm font-semibold text-brand-dark">
                Distribución del estado
              </h3>
              <DonutChart
                centerLabel="empleados"
                segments={[
                  { label: "Normal", value: summary.green, color: "#16a34a", segment: "green" },
                  { label: "En riesgo", value: summary.yellow, color: "#FF8400", segment: "yellow" },
                  { label: "Excedido", value: summary.red, color: "#dc2626", segment: "red" },
                ]}
              />
            </div>

            <div className="rounded-lg border border-slate-100 p-4">
              <h3 className="mb-1 text-sm font-semibold text-brand-dark">
                Horas extra por tramo del mes
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Suma de la vista en cada tramo · los tramos parciales tienen menos días
              </p>
              <TrendChart
                points={charts.trend
                  .filter((w) => !w.future)
                  .map((w) => ({ label: w.short, value: w.overtime }))}
              />
            </div>

            <div className="rounded-lg border border-slate-100 p-4">
              <h3 className="mb-4 text-sm font-semibold text-brand-dark">
                Horas extra por área <span className="font-normal text-slate-500">· toque para ver detalle</span>
              </h3>
              <HBarChart
                drill={{ param: "area", clear: ["ceco"] }}
                items={charts.byArea.map((a) => ({
                  label: a.area,
                  value: a.overtime,
                  sublabel: groupSub(a),
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
                  employeeId: t.id,
                }))}
              />
            </div>

            <div className="rounded-lg border border-slate-100 p-4">
              <h3 className="mb-4 text-sm font-semibold text-brand-dark">
                Horas extra por planta <span className="font-normal text-slate-500">· toque para ver detalle</span>
              </h3>
              <HBarChart
                color="#00CBBF"
                drill={{ param: "planta", clear: ["direccion", "area", "ceco", "jefe"] }}
                items={charts.byPlant.map((g) => ({
                  label: g.label,
                  value: g.overtime,
                  sublabel: groupSub(g),
                }))}
              />
            </div>

            <div className="rounded-lg border border-slate-100 p-4">
              <h3 className="mb-4 text-sm font-semibold text-brand-dark">
                Horas extra por dirección <span className="font-normal text-slate-500">· toque para ver detalle</span>
              </h3>
              <HBarChart
                color="#003865"
                drill={{ param: "direccion", clear: ["area", "ceco", "jefe"] }}
                items={charts.byDireccion.map((g) => ({
                  label: g.label,
                  value: g.overtime,
                  sublabel: groupSub(g),
                }))}
              />
            </div>
          </div>
        </CollapsibleCard>

        {/* Heatmap área × tramo */}
        <CollapsibleCard
          title="Mapa de calor · horas por persona, por área y tramo"
          delay={400}
          subtitle="Cada celda compara las horas por persona del área con la meta del tramo. ▲ = por encima de la meta."
          defaultOpen={false}
        >
          <Heatmap data={charts.heatmap} />
        </CollapsibleCard>

        {/* Proyección de cierre + reincidentes */}
        <CollapsibleCard
          title="En riesgo y reincidentes"
          delay={450}
          subtitle="Quién va por encima de la meta o cerraría por encima de 48h, y quién repite semanas de más de 12h."
          defaultOpen={false}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-100 p-4">
              <h3 className="mb-3 text-sm font-semibold text-brand-dark">
                En riesgo
              </h3>
              {atRisk.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  Nadie va por encima de la meta ni proyecta superar {RULES.MONTHLY_OVERTIME_LIMIT}h.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {atRisk.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 py-2.5">
                      <EmployeeLink
                        id={s.id}
                        href={empLink(s.id)}
                        className="min-w-0 truncate font-medium text-brand-dark hover:underline"
                      >
                        {s.name ?? s.code}
                      </EmployeeLink>
                      <span className="hidden truncate text-xs text-slate-500 sm:block">
                        {s.area}
                      </span>
                      <span className="ml-auto shrink-0 text-right tabular-nums text-slate-600">
                        {s.risk === "meta" ? (
                          <>
                            {fmtH(s.monthlyOvertime)}{" "}
                            <span className="font-semibold text-status-yellow">
                              (+{fmtH(s.overTarget)} meta)
                            </span>
                          </>
                        ) : (
                          <>
                            {fmtH(s.monthlyOvertime)} →{" "}
                            <span className="font-semibold text-status-yellow">
                              ≈{fmtH(s.projectedMonthlyOvertime)}
                            </span>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-slate-100 p-4">
              <h3 className="mb-3 text-sm font-semibold text-brand-dark">
                Reincidentes · 2 o más semanas de más de {RULES.WEEKLY_OVERTIME_LIMIT}h
              </h3>
              {charts.reincidentes.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  Sin reincidentes este mes.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {charts.reincidentes.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 py-2.5">
                      <EmployeeLink
                        id={r.id}
                        href={empLink(r.id)}
                        className="min-w-0 truncate font-medium text-brand-dark hover:underline"
                      >
                        {r.name}
                      </EmployeeLink>
                      <StatusBadge level={r.level} />
                      <span className="ml-auto shrink-0 text-xs font-medium text-slate-600">
                        {r.weeksHigh} semanas &gt; {RULES.WEEKLY_OVERTIME_LIMIT}h
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Detalle por empleado"
          subtitle="Busque, filtre por estado y toque una fila para ver el detalle a la derecha."
          delay={550}
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
            query={query}
          />
        </CollapsibleCard>
      </div>
    </DrawerProvider>
  );
}
