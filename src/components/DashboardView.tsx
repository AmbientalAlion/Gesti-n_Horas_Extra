import { KpiCard } from "./KpiCard";
import { AlertsCenter } from "./AlertsCenter";
import { DrawerProvider } from "./drawer/DrawerProvider";
import { FilterableEmployeeTable } from "./FilterableEmployeeTable";
import { EmployeeSearch } from "./EmployeeSearch";
import { CollapsibleCard } from "./CollapsibleCard";
import { TrendChart } from "./charts/TrendChart";
import { HBarChart } from "./charts/HBarChart";
import { Heatmap } from "./charts/Heatmap";
import { DashboardFilters } from "./DashboardFilters";
import { MonthHero, type HeroNotice } from "./dashboard/MonthHero";
import { DashboardNavProvider, DataRegion } from "./dashboard/DashboardNav";
import { WeeklyView } from "./dashboard/WeeklyView";
import { fmtH, monthlyTarget, RULES } from "@/lib/overtime";
import {
  daysInMonth as monthDays,
  formatDayLong,
  monthLabel,
  monthSegments,
} from "@/lib/dates";
import type { Role } from "@/lib/types";
import type {
  DashboardCharts,
  EmployeeStatus,
  Filters,
  FilterOptions,
  Period,
  PlantSummary,
} from "@/lib/aggregate";

type ViewRole = Role | "demo";

const ROLE_FOCUS: Record<ViewRole, { tag: string; focus: string }> = {
  rrhh: {
    tag: "Recursos Humanos",
    focus:
      "Toda la organización: quién va por encima de la meta, quién superó 48h y qué registros hay que revisar.",
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
    focus: "Explore la herramienta cambiando de rol y filtrando por planta, dirección, área o jefe.",
  },
};

/**
 * Qué gráficos ve cada rol y en qué orden. Los gráficos de grupo con menos
 * de dos barras no se muestran (una sola barra no compara nada).
 */
type ChartKey = "trend" | "top" | "area" | "plant" | "direccion";
const ROLE_CHARTS: Record<ViewRole, ChartKey[]> = {
  rrhh: ["trend", "plant", "direccion", "area", "top"],
  demo: ["trend", "plant", "direccion", "area", "top"],
  director: ["trend", "top", "area", "direccion", "plant"],
  jefe: ["top", "trend", "area"],
};

/** Datos del mes que se muestran en la cabecera y usa el panel lateral. */
function periodInfo(period: Period) {
  const days = period.daysInMonth ?? monthDays(period.year, period.month);
  const cutoff = period.cutoffDay ?? 0;
  const cutoffLabel =
    cutoff > 0 ? formatDayLong({ y: period.year, m: period.month, d: cutoff }) : null;
  const month = monthLabel(period.year, period.month);
  const note =
    period.status === "futuro"
      ? "el mes aún no empieza"
      : !cutoffLabel
        ? "sin datos cargados"
        : period.status === "cerrado"
          ? "mes cerrado"
          : undefined;
  return {
    hero: {
      monthLabel: month,
      note,
      cutoffDay: cutoff,
      cutoffLabel,
      daysInMonth: days,
      target: monthlyTarget(cutoff),
      ticks: monthSegments(period.year, period.month).map((s) => s.end.d),
    },
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

/** Aviso de acción del encabezado, según el rol. */
function heroNotice(
  role: ViewRole,
  statuses: EmployeeStatus[],
  summary: PlantSummary,
  reviewHref?: string
): HeroNotice | null {
  if (role === "rrhh" || role === "demo") {
    if (summary.withErrors > 0)
      return {
        tone: "pending",
        text: "Hay registros congelados esperando revisión: no suman al acumulado hasta resolverlos.",
        action: reviewHref ? { label: "Revisar ahora", href: reviewHref } : undefined,
      };
    return null;
  }
  if (role === "director") {
    if (summary.riskByProjection > 0)
      return {
        tone: "risk",
        text: `A su ritmo, hay personas que cerrarían el mes por encima de ${RULES.MONTHLY_OVERTIME_LIMIT}h.`,
        action: { label: "Ver alertas", href: "#alertas" },
      };
    if (summary.withErrors > 0)
      return {
        tone: "info",
        text: "Recursos Humanos está revisando registros de su dirección; el estado de esas personas puede cambiar.",
      };
    return null;
  }
  // Jefe: la persona que más se pasa de la meta.
  const top = statuses
    .filter((s) => s.overTarget > 0)
    .sort((a, b) => b.overTarget - a.overTarget)[0];
  if (top)
    return {
      tone: top.level === "red" ? "over" : "risk",
      text: `${top.name ?? top.code} es quien más se pasa de la meta: +${fmtH(top.overTarget)}.`,
      action: { label: "Ver detalle", employeeId: top.id },
    };
  if (summary.withErrors > 0)
    return {
      tone: "info",
      text: "Recursos Humanos está revisando registros de su equipo; el estado de esas personas puede cambiar.",
    };
  return null;
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
  role?: ViewRole;
  toolbar?: React.ReactNode;
  filterOptions?: FilterOptions;
  filters?: Filters;
  /** Query string vigente (filtros y mes), para no perder el contexto. */
  query?: string;
}) {
  const info = periodInfo(period);
  const noData = info.drawer.cutoffDay === 0;
  const isRrhh = role === "rrhh" || role === "demo";
  const reviewHref = isRrhh
    ? `${hrefBase.replace(/\/empleado$/, "/revisiones")}${roleParam ? `?rol=${roleParam}` : ""}`
    : undefined;

  // Los enlaces a la ficha arrastran los filtros vigentes para poder volver
  // al panel exactamente como estaba.
  const empLink = (id: string) => {
    const qs = [query, roleParam ? `rol=${roleParam}` : ""].filter(Boolean).join("&");
    return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
  };

  const perPerson =
    summary.totalEmployees > 0 ? summary.totalMonthlyOvertime / summary.totalEmployees : 0;

  // ---- Gráficos ----
  const chartTitle = (t: string, drill?: boolean) => (
    <h3 className="mb-3 text-ui font-semibold text-heading">
      {t}
      {drill && <span className="font-normal text-muted"> · toque para ver detalle</span>}
    </h3>
  );
  const groupChart = (
    key: ChartKey,
    title: string,
    items: { label: string; overtime: number; count: number; red: number; yellow: number; perPerson: number }[],
    drill: { param: string; clear: string[] }
  ) =>
    items.length >= 2
      ? {
          key,
          node: (
            <>
              {chartTitle(title, true)}
              <HBarChart
                color="rgb(var(--c-chart-1))"
                drill={drill}
                items={items.map((g) => ({
                  label: g.label,
                  value: g.overtime,
                  sublabel: groupSub(g),
                }))}
              />
            </>
          ),
        }
      : null;

  const CHARTS: Record<ChartKey, { key: ChartKey; node: React.ReactNode } | null> = {
    trend: {
      key: "trend",
      node: (
        <>
          <h3 className="text-ui font-semibold text-heading">Horas extra por tramo del mes</h3>
          <p className="mb-3 text-caption font-normal text-muted">
            Suma de la vista en cada tramo · los tramos parciales tienen menos días
          </p>
          <TrendChart
            points={charts.trend
              .filter((w) => !w.future)
              .map((w) => ({ label: w.short, value: w.overtime }))}
          />
        </>
      ),
    },
    top:
      charts.topEmployees.length > 0
        ? {
            key: "top",
            node: (
              <>
                {chartTitle(role === "jefe" ? "Mi equipo por horas extra" : "Top empleados por horas extra")}
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
              </>
            ),
          }
        : null,
    area: groupChart(
      "area",
      "Horas extra por área",
      charts.byArea.map((a) => ({ ...a, label: a.area })),
      { param: "area", clear: ["ceco"] }
    ),
    plant: groupChart("plant", "Horas extra por planta", charts.byPlant, {
      param: "planta",
      clear: ["direccion", "area", "ceco", "jefe"],
    }),
    direccion: groupChart("direccion", "Horas extra por dirección", charts.byDireccion, {
      param: "direccion",
      clear: ["area", "ceco", "jefe"],
    }),
  };
  const chartBlocks = ROLE_CHARTS[role]
    .map((k) => CHARTS[k])
    .filter((c): c is { key: ChartKey; node: React.ReactNode } => c !== null);

  const showHeatmap = role !== "jefe" || charts.heatmap.areas.length >= 2;

  return (
    <DrawerProvider
      statuses={statuses}
      segmentsByEmployee={charts.segmentsByEmployee}
      period={info.drawer}
      hrefBase={hrefBase}
      roleParam={roleParam}
      query={query}
    >
      <DashboardNavProvider>
        <div className="space-y-5 sm:space-y-6">
          {/* Estado del mes: la respuesta en 5 segundos. */}
          <MonthHero
            roleTag={ROLE_FOCUS[role].tag}
            scopeLabel={scopeLabel}
            focus={ROLE_FOCUS[role].focus}
            period={info.hero}
            counts={{ red: summary.red, yellow: summary.yellow, green: summary.green }}
            riskByTarget={summary.riskByTarget}
            riskByProjection={summary.riskByProjection}
            notice={heroNotice(role, statuses, summary, reviewHref)}
            toolbar={toolbar}
          />

          {/* Buscar y filtrar la vista. */}
          <div className="reveal print:hidden" style={{ "--i": 1 } as React.CSSProperties}>
            <EmployeeSearch
              rows={statuses}
              hrefBase={hrefBase}
              roleParam={roleParam}
              query={query}
            />
          </div>
          {filterOptions && filters && (
            <DashboardFilters options={filterOptions} current={filters} />
          )}

          <DataRegion
            className="space-y-5 sm:space-y-6"
            doneMessage={`Panel actualizado: ${summary.totalEmployees} persona${summary.totalEmployees === 1 ? "" : "s"} en la vista.`}
          >
            {noData && (
              <div className="card flex items-start gap-3">
                <span aria-hidden className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-line-strong" />
                <div>
                  <p className="text-ui font-semibold text-heading">
                    Sin datos cargados para este mes
                  </p>
                  <p className="mt-1 text-small text-ink-2">
                    Cuando Recursos Humanos cargue el archivo del biométrico, aquí aparecerán el
                    acumulado, la meta y las alertas.
                  </p>
                </div>
              </div>
            )}

            {/* KPIs: cada uno abre a la derecha la lista de personas que lo
                componen. No repiten el semáforo del encabezado. */}
            <section aria-label="Indicadores del mes" className="reveal-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <KpiCard
                className="col-span-2 sm:col-span-1"
                label="Horas extra del mes"
                value={summary.totalMonthlyOvertime}
                decimals={1}
                suffix="h"
                icon="clock"
                hint={
                  summary.totalEmployees > 0
                    ? `Promedio de ${fmtH(perPerson)} por persona`
                    : "Sin personas en la vista"
                }
                segment="all"
              />
              <KpiCard
                label={`Semanas de más de ${RULES.WEEKLY_OVERTIME_LIMIT}h`}
                value={summary.weeklyHigh}
                tone={summary.weeklyHigh > 0 ? "info" : "default"}
                icon="calendar"
                hint={
                  summary.weeklyHigh > 0
                    ? `De ${summary.weeklyHighPeople} persona${summary.weeklyHighPeople === 1 ? "" : "s"} · informativo`
                    : "Lunes a domingo · informativo"
                }
                segment="weeklyHigh"
              />
              <KpiCard
                label="Registros por revisar"
                value={summary.withErrors}
                tone={summary.withErrors > 0 ? "pending" : "default"}
                icon="review"
                hint={
                  isRrhh
                    ? `Turnos de más de ${RULES.ORPHAN_SHIFT_HOURS}h sin salida, congelados`
                    : "Los revisa Recursos Humanos; el estado puede cambiar"
                }
                segment="errors"
              />
            </section>

            {/* Centro de alertas: cada alerta es una fila desplegable. */}
            <AlertsCenter reviewHref={reviewHref} role={role} />

            {/* Semanas del calendario: elegir una semana y filtrar a las personas. */}
            {!noData && (
              <CollapsibleCard
                id="semanas"
                title="Por semanas del calendario"
                subtitle="Elija una semana (lunes a domingo, recortada al mes) o vea todo el mes en una matriz. Toque una persona para ver su detalle."
              >
                <WeeklyView
                  statuses={statuses}
                  segmentsByEmployee={charts.segmentsByEmployee}
                  trend={charts.trend}
                />
              </CollapsibleCard>
            )}

            {/* Gráficos, en el orden que más le sirve a cada rol. */}
            {chartBlocks.length > 0 && (
              <CollapsibleCard
                title="Gráficos y distribución"
                subtitle="Toque cualquier barra o persona: el detalle se abre a la derecha."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  {chartBlocks.map((c, i) => (
                    <article
                      key={c.key}
                      className={
                        "min-w-0 rounded-card border border-line p-4" +
                        (i === chartBlocks.length - 1 && chartBlocks.length % 2 === 1
                          ? " lg:col-span-2"
                          : "")
                      }
                    >
                      {c.node}
                    </article>
                  ))}
                </div>
              </CollapsibleCard>
            )}

            {/* Mapa de calor área × tramo (se monta al abrirlo). */}
            {showHeatmap && (
              <CollapsibleCard
                title="Mapa de calor · horas por persona, por área y tramo"
                subtitle="Cada celda compara las horas por persona del área con la meta del tramo. ▲ = por encima de la meta."
                defaultOpen={role === "director"}
                lazy
              >
                <Heatmap data={charts.heatmap} />
              </CollapsibleCard>
            )}

            <CollapsibleCard
              id="detalle"
              title="Detalle por empleado"
              subtitle="Busque, filtre por estado y toque una fila para ver el detalle a la derecha."
            >
              <FilterableEmployeeTable
                rows={statuses}
                hrefBase={hrefBase}
                roleParam={roleParam}
                query={query}
              />
            </CollapsibleCard>
          </DataRegion>
        </div>
      </DashboardNavProvider>
    </DrawerProvider>
  );
}
