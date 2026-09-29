// Agregaciones para los dashboards: combina empleados + registros por tramo
// con la lógica de negocio (requerimientos v2) para producir el estado de
// cada persona y los datos de las visualizaciones.
//
// Conceptos:
//  - Tramo: parte de una semana ISO dentro del mes calendario.
//  - Acumulado (A): horas extra válidas del mes hasta la fecha de corte.
//  - Meta: 12h por semana, proporcional en tramos parciales, tope 48h.
//  - Estado: Excedido (>48h), En riesgo (sobre la meta o proyección >48h) o
//    Normal. La alerta de 12h por semana es aparte e informativa.

import { evaluateMonth, fmtH, monthlyTarget, RULES, round2, type RiskReason } from "./overtime";
import type { SemaphoreLevel, WeeklyRecord } from "./types";
import {
  cutoffDay as computeCutoff,
  daysInMonth as monthDays,
  formatDayLong,
  formatWeekLabel,
  monthSegments,
  todayInPlant,
  weekInfo,
  isoWeekMonday,
  type MonthStatus,
  type Segment,
} from "./dates";

export interface EmployeeInput {
  id: string;
  code: string;
  name?: string;
  /** Área = texto tras el guion del centro de costo (p. ej. "GESTIÓN MANTENIMIENTO"). */
  area?: string;
  /** Dirección = CONCRETOS / DIRECCIÓN INDUSTRIAL / DIRECCIÓN COMERCIAL. */
  direccion?: string;
  costCenter?: string;
  plant?: string;
  roleTitle?: string;
  managerId?: string | null;
  managerName?: string;
}

/** Una semana de lunes a domingo con más de 12h extra (alerta informativa). */
export interface HighWeek {
  isoYear: number;
  week: number;
  /** «1 al 7 feb» o «28 sep al 4 oct». */
  label: string;
  hours: number;
  /** true si la semana cruza de mes. */
  shared: boolean;
  /** true si se cuenta en este mes (el mes donde tiene más días). */
  counted: boolean;
}

export interface EmployeeStatus extends EmployeeInput {
  /** Acumulado válido del mes hasta la fecha de corte. */
  monthlyOvertime: number;
  /** Meta acumulada a la fecha de corte. */
  target: number;
  /** Horas por encima de la meta (0 si está dentro). */
  overTarget: number;
  level: SemaphoreLevel;
  /** Motivo de «En riesgo»: por meta o por proyección. */
  risk: RiskReason;
  reasons: string[];
  /** Horas de la semana de referencia (lunes a domingo completa). */
  weeklyOvertime: number;
  /** La semana de referencia pasó de 12h. */
  weeklyHigh: boolean;
  /** Semanas de más de 12h contadas en este mes. */
  highWeeksMonth: number;
  highWeeks: HighWeek[];
  /** true si tiene registros congelados del mes AÚN SIN REVISAR. */
  hasError: boolean;
  pendingReviewCount: number;
  /** Acumulado si los registros pendientes se validaran tal como llegaron. */
  potentialMonthlyOvertime: number;
  /** Alguna hora del mes es estimada (semana cruzada sin detalle diario). */
  estimated: boolean;
  projectedMonthlyOvertime: number;
  /** true con al menos 7 días de datos. */
  projectionReliable: boolean;
  /** La proyección de cierre pasa de 48h. */
  willExceedMonthly: boolean;
}

export interface Filters {
  plant?: string;
  direccion?: string;
  area?: string;
  costCenter?: string;
  manager?: string;
}

export interface FilterOptions {
  plants: string[];
  directions: string[];
  areas: string[];
  costCenters: string[];
  managers: string[];
}

/**
 * Opciones de filtro en cascada: cada dimensión muestra solo los valores que
 * siguen siendo posibles dadas las OTRAS selecciones activas. Así, al elegir la
 * planta "RIO CLARO", los desplegables de dirección/área/centro de costo/jefe se
 * limitan a esa locación (faceted search). Sin filtros, muestra todo el alcance.
 */
export function buildFilterOptions(
  employees: EmployeeInput[],
  filters: Filters = {}
): FilterOptions {
  const uniq = (xs: (string | undefined)[]) =>
    [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  // Para cada dimensión, aplica todos los filtros MENOS el propio, de modo que
  // sus opciones reflejen el resto de la selección pero no se auto-restrinjan.
  const opts = (self: keyof Filters, pick: (e: EmployeeInput) => string | undefined) =>
    uniq(applyFilters(employees, { ...filters, [self]: undefined }).map(pick));
  return {
    plants: opts("plant", (e) => e.plant),
    directions: opts("direccion", (e) => e.direccion),
    areas: opts("area", (e) => e.area),
    costCenters: opts("costCenter", (e) => e.costCenter),
    managers: opts("manager", (e) => e.managerName),
  };
}

/** Aplica los filtros (planta/dirección/área/centro de costo/jefe). */
export function applyFilters<T extends EmployeeInput>(
  employees: T[],
  filters: Filters
): T[] {
  return employees.filter((e) => {
    if (filters.plant && (e.plant ?? "") !== filters.plant) return false;
    if (filters.direccion && (e.direccion ?? "") !== filters.direccion) return false;
    if (filters.area && (e.area ?? "") !== filters.area) return false;
    if (filters.costCenter && (e.costCenter ?? "") !== filters.costCenter) return false;
    if (filters.manager && (e.managerName ?? "") !== filters.manager) return false;
    return true;
  });
}


export interface PlantSummary {
  totalEmployees: number;
  /** Normal. */
  green: number;
  /** En riesgo. */
  yellow: number;
  /** Excedido (más de 48h). */
  red: number;
  /** En riesgo por estar sobre la meta. */
  riskByTarget: number;
  /** En riesgo solo por la proyección. */
  riskByProjection: number;
  withErrors: number;
  totalMonthlyOvertime: number;
  /** Semanas de más de 12h contadas en el mes, sumadas entre personas. */
  weeklyHigh: number;
  /** Personas con al menos una semana de más de 12h en el mes. */
  weeklyHighPeople: number;
}

export interface Period {
  /** Año y mes calendario. */
  year: number;
  month: number;
  /** Semana ISO del tramo de referencia (el de la fecha de corte). */
  week: number;
  /** Estado del mes frente a hoy. Sin valor se asume abierto. */
  status?: MonthStatus;
  daysInMonth?: number;
  /** Día de la fecha de corte (0 = sin datos). Se calcula si no viene. */
  cutoffDay?: number;
}

/** Periodo con todos sus campos resueltos. */
export interface ResolvedPeriod extends Period {
  status: MonthStatus;
  daysInMonth: number;
  cutoffDay: number;
  /** «20 de septiembre», o null sin datos. */
  cutoffLabel: string | null;
  segments: Segment[];
}

/** Completa días del mes, fecha de corte y tramos. */
export function resolvePeriod(
  period: Period,
  records: WeeklyRecord[],
  today = todayInPlant()
): ResolvedPeriod {
  const daysInMonth = period.daysInMonth ?? monthDays(period.year, period.month);
  const cutoff = period.cutoffDay ?? computeCutoff(records, period.year, period.month, today);
  const segments = monthSegments(period.year, period.month);
  const ref =
    cutoff > 0
      ? segments.find((s) => s.start.d <= cutoff && cutoff <= s.end.d)
      : undefined;
  return {
    ...period,
    week: ref?.week ?? period.week,
    status: period.status ?? "abierto",
    daysInMonth,
    cutoffDay: cutoff,
    cutoffLabel:
      cutoff > 0 ? formatDayLong({ y: period.year, m: period.month, d: cutoff }) : null,
    segments,
  };
}

/** Punto de un tramo para la ficha y el panel lateral. */
export interface SegmentPoint {
  key: string;
  label: string;
  short: string;
  week: number;
  isoYear: number;
  days: number;
  partial: boolean;
  /** Horas válidas del tramo. */
  hours: number;
  /** Acumulado válido al final del tramo. */
  cumulative: number;
  /** Meta acumulada al final del tramo. */
  target: number;
  /** Meta propia del tramo (12h × días / 7, recortada al tope). */
  segmentTarget: number;
  /** Tramo con registro congelado sin revisar. */
  pending: boolean;
  /** Tramo con registro congelado ya descartado. */
  discarded: boolean;
  /** Horas brutas del registro congelado (si trae totales). */
  grossHours?: number;
  estimated: boolean;
  /** Horas de la semana completa (lunes a domingo). */
  weekHours: number;
  weekHigh: boolean;
  /** La semana cruza de mes. */
  weekShared: boolean;
  /** El tramo empieza después de la fecha de corte (aún sin datos). */
  future: boolean;
  /** Hay algún registro del tramo. */
  hasData: boolean;
}

/** Año ISO de la semana de un registro (año del mes, salvo en los bordes). */
export function recordIsoYear(r: { year: number; month: number; week: number }): number {
  if (r.month === 1 && r.week >= 52) return r.year - 1;
  if (r.month === 12 && r.week === 1) return r.year + 1;
  return r.year;
}

const weekId = (isoYear: number, week: number) => `${isoYear}-${week}`;

/** Horas válidas por semana ISO completa (sumando los tramos de ambos meses). */
function weekTotals(records: WeeklyRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of records) {
    if (r.hasError) continue;
    const k = weekId(recordIsoYear(r), r.week);
    m.set(k, round2((m.get(k) ?? 0) + r.overtimeHours));
  }
  return m;
}

/** Tramos del mes de una persona, con acumulado y meta. */
export function segmentPoints(
  p: ResolvedPeriod,
  empRecords: WeeklyRecord[]
): SegmentPoint[] {
  const weeks = weekTotals(empRecords);
  let cum = 0;
  let prevTarget = 0;
  return p.segments.map((s) => {
    const recs = empRecords.filter(
      (r) => r.year === p.year && r.month === p.month && r.week === s.week
    );
    const valid = recs.filter((r) => !r.hasError);
    const hours = round2(valid.reduce((a, r) => a + r.overtimeHours, 0));
    cum = round2(cum + hours);
    const target = monthlyTarget(s.end.d);
    const segmentTarget = round2(target - prevTarget);
    prevTarget = target;
    const pendingRec = recs.find((r) => r.hasError && !r.reviewStatus);
    const discarded = recs.some((r) => r.hasError && r.reviewStatus === "descartado");
    const weekHours = weeks.get(weekId(s.isoYear, s.week)) ?? 0;
    return {
      key: s.key,
      label: s.label,
      short: s.short,
      week: s.week,
      isoYear: s.isoYear,
      days: s.days,
      partial: s.partial,
      hours,
      cumulative: cum,
      target,
      segmentTarget,
      pending: !!pendingRec,
      discarded,
      grossHours:
        pendingRec && pendingRec.source !== "novedades" ? pendingRec.totalHours : undefined,
      estimated: recs.some((r) => r.estimated),
      weekHours,
      weekHigh: weekHours > RULES.WEEKLY_OVERTIME_LIMIT,
      // Un tramo parcial siempre es parte de una semana que cruza de mes.
      weekShared: s.partial,
      future: p.cutoffDay > 0 ? s.start.d > p.cutoffDay : true,
      hasData: recs.length > 0,
    };
  });
}

/** Semanas completas de más de 12h que tocan el mes. */
function highWeeksOf(p: ResolvedPeriod, empRecords: WeeklyRecord[]): HighWeek[] {
  const weeks = weekTotals(empRecords);
  const out: HighWeek[] = [];
  for (const s of p.segments) {
    const hours = weeks.get(weekId(s.isoYear, s.week)) ?? 0;
    if (hours <= RULES.WEEKLY_OVERTIME_LIMIT) continue;
    const thursdayMonth = weekInfo(isoWeekMonday(s.isoYear, s.week)).month;
    out.push({
      isoYear: s.isoYear,
      week: s.week,
      label: formatWeekLabel(s.isoYear, s.week),
      hours,
      shared: s.days < 7,
      counted: thursdayMonth === p.month,
    });
  }
  return out;
}

/**
 * Estado de cada empleado para un mes. `records` puede traer tramos de los
 * meses vecinos: se usan solo para completar las semanas que cruzan de mes
 * (alerta de 12h de lunes a domingo).
 */
export function computeEmployeeStatuses(
  employees: EmployeeInput[],
  records: WeeklyRecord[],
  period: Period
): EmployeeStatus[] {
  const p = resolvePeriod(period, records);
  const byEmployee = groupBy(records, (r) => r.employeeId);
  const closed = p.status === "cerrado";

  return employees.map((emp) => {
    const empRecords = byEmployee.get(emp.id) ?? [];
    const monthRecords = empRecords.filter(
      (r) => r.year === p.year && r.month === p.month
    );
    const valid = monthRecords.filter((r) => !r.hasError);
    const monthlyOvertime = round2(valid.reduce((a, r) => a + r.overtimeHours, 0));

    const pending = monthRecords.filter((r) => r.hasError && !r.reviewStatus);
    const hasError = pending.length > 0;
    const potentialExtra = round2(
      pending
        .filter((r) => r.source !== "novedades")
        .reduce((a, r) => a + Math.max(0, r.totalHours - RULES.WEEKLY_BASE_HOURS), 0)
    );
    const potentialMonthlyOvertime = round2(monthlyOvertime + potentialExtra);

    const ev = evaluateMonth({
      accumulated: monthlyOvertime,
      cutoffDay: p.cutoffDay,
      daysInMonth: p.daysInMonth,
      closed,
      cutoffLabel: p.cutoffLabel ?? undefined,
    });

    const highWeeks = highWeeksOf(p, empRecords);
    const highWeeksMonth = highWeeks.filter((w) => w.counted).length;
    const refSeg = p.segments.find((s) => s.week === p.week);
    const weeklyOvertime = refSeg
      ? weekTotals(empRecords).get(weekId(refSeg.isoYear, refSeg.week)) ?? 0
      : 0;
    const estimated = monthRecords.some((r) => r.estimated);

    const reasons = [...ev.reasons];
    if (highWeeks.length > 0) {
      reasons.push(
        `Semana${highWeeks.length > 1 ? "s" : ""} de más de ${RULES.WEEKLY_OVERTIME_LIMIT}h ` +
          `(informativo): ${highWeeks.map((w) => `${w.label}, ${fmtH(w.hours)}`).join("; ")}.`
      );
    }
    if (hasError) {
      const n = pending.length;
      reasons.push(
        `Tiene ${n} registro${n > 1 ? "s" : ""} congelado${n > 1 ? "s" : ""} por revisar` +
          (potentialExtra > 0
            ? `: según se resuelva${n > 1 ? "n" : ""}, el mes quedaría entre ${fmtH(monthlyOvertime)} y ${fmtH(potentialMonthlyOvertime)}` +
              (potentialMonthlyOvertime > RULES.MONTHLY_OVERTIME_LIMIT &&
              monthlyOvertime <= RULES.MONTHLY_OVERTIME_LIMIT
                ? `, por encima del límite de ${RULES.MONTHLY_OVERTIME_LIMIT}h.`
                : ".")
            : ".")
      );
    }
    if (estimated) {
      reasons.push(
        "Incluye horas estimadas: una semana que cruza de mes llegó sin detalle por día y se repartió por días."
      );
    }

    return {
      ...emp,
      monthlyOvertime,
      target: ev.target,
      overTarget: ev.overTarget,
      level: ev.level,
      risk: ev.risk,
      reasons,
      weeklyOvertime,
      weeklyHigh: weeklyOvertime > RULES.WEEKLY_OVERTIME_LIMIT,
      highWeeksMonth,
      highWeeks,
      hasError,
      pendingReviewCount: pending.length,
      potentialMonthlyOvertime,
      estimated,
      projectedMonthlyOvertime: ev.projected,
      projectionReliable: ev.projectionReliable,
      willExceedMonthly: ev.projected > RULES.MONTHLY_OVERTIME_LIMIT,
    };
  });
}

/** Resumen agregado del alcance filtrado. */
export function summarize(statuses: EmployeeStatus[]): PlantSummary {
  return {
    totalEmployees: statuses.length,
    green: statuses.filter((s) => s.level === "green").length,
    yellow: statuses.filter((s) => s.level === "yellow").length,
    red: statuses.filter((s) => s.level === "red").length,
    riskByTarget: statuses.filter((s) => s.risk === "meta").length,
    riskByProjection: statuses.filter((s) => s.risk === "proyeccion").length,
    withErrors: statuses.filter((s) => s.hasError).length,
    totalMonthlyOvertime: round2(statuses.reduce((acc, s) => acc + s.monthlyOvertime, 0)),
    weeklyHigh: statuses.reduce((a, s) => a + s.highWeeksMonth, 0),
    weeklyHighPeople: statuses.filter((s) => s.highWeeksMonth > 0).length,
  };
}

export interface GroupOvertime {
  label: string;
  overtime: number;
  count: number;
  red: number;
  /** En riesgo. */
  yellow: number;
  /** Horas por persona del grupo. */
  perPerson: number;
}

/** Compatibilidad: el grupo por área usa `area` como etiqueta. */
export interface AreaOvertime extends GroupOvertime {
  area: string;
}

export interface SegmentTrendPoint {
  key: string;
  short: string;
  label: string;
  partial: boolean;
  /** Horas válidas del tramo en la vista. */
  overtime: number;
  /** Meta del tramo por persona. */
  segmentTarget: number;
  future: boolean;
}

export interface TopEmployee {
  id: string;
  name: string;
  overtime: number;
  level: SemaphoreLevel;
  area: string;
}

export interface HeatmapSegment {
  key: string;
  short: string;
  label: string;
  segmentTarget: number;
}

export interface HeatmapData {
  areas: string[];
  segments: HeatmapSegment[];
  /** Horas por persona del área en cada tramo. */
  values: Record<string, Record<string, number>>;
  /** Personas por área (denominador). */
  headcount: Record<string, number>;
}

export interface Reincidente {
  id: string;
  name: string;
  area: string;
  level: SemaphoreLevel;
  weeksHigh: number;
}

export interface DashboardCharts {
  /** Tramos del mes por empleado (panel lateral de detalle). */
  segmentsByEmployee: Record<string, SegmentPoint[]>;
  byArea: AreaOvertime[];
  byDireccion: GroupOvertime[];
  byPlant: GroupOvertime[];
  trend: SegmentTrendPoint[];
  topEmployees: TopEmployee[];
  heatmap: HeatmapData;
  reincidentes: Reincidente[];
}

/** Datos derivados para las visualizaciones del dashboard. */
export function computeDashboardCharts(
  statuses: EmployeeStatus[],
  records: WeeklyRecord[],
  period: Period
): DashboardCharts {
  const p = resolvePeriod(period, records);

  const group = (keyFn: (s: EmployeeStatus) => string): GroupOvertime[] => {
    const m = new Map<string, GroupOvertime>();
    for (const s of statuses) {
      const label = keyFn(s) || "Sin asignar";
      const cur = m.get(label) ?? { label, overtime: 0, count: 0, red: 0, yellow: 0, perPerson: 0 };
      cur.overtime = round2(cur.overtime + s.monthlyOvertime);
      cur.count += 1;
      if (s.level === "red") cur.red += 1;
      if (s.level === "yellow") cur.yellow += 1;
      m.set(label, cur);
    }
    for (const g of m.values()) g.perPerson = round2(g.overtime / g.count);
    return [...m.values()].sort((a, b) => b.overtime - a.overtime);
  };
  const byArea: AreaOvertime[] = group((s) => s.area ?? "").map((g) => ({
    ...g,
    area: g.label,
  }));
  const byDireccion = group((s) => s.direccion ?? "");
  const byPlant = group((s) => s.plant ?? "");

  const byEmployee = groupBy(records, (r) => r.employeeId);
  const segmentsByEmployee: Record<string, SegmentPoint[]> = {};
  for (const s of statuses) {
    segmentsByEmployee[s.id] = segmentPoints(p, byEmployee.get(s.id) ?? []);
  }

  // Tendencia por tramo del mes (horas válidas de la vista).
  const trend: SegmentTrendPoint[] = p.segments.map((seg, i) => {
    const overtime = round2(
      statuses.reduce((a, s) => a + (segmentsByEmployee[s.id]?.[i]?.hours ?? 0), 0)
    );
    const pt = segmentsByEmployee[statuses[0]?.id]?.[i];
    return {
      key: seg.key,
      short: seg.short,
      label: seg.label,
      partial: seg.partial,
      overtime,
      segmentTarget: pt?.segmentTarget ?? round2((RULES.WEEKLY_OVERTIME_LIMIT * seg.days) / 7),
      future: p.cutoffDay > 0 ? seg.start.d > p.cutoffDay : true,
    };
  });

  const topEmployees: TopEmployee[] = statuses
    .filter((s) => s.monthlyOvertime > 0)
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime)
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.name ?? s.code,
      overtime: s.monthlyOvertime,
      level: s.level,
      area: s.area ?? "Sin área",
    }));

  // Mapa de calor: áreas × tramos, en horas por persona del área (así un área
  // grande no aparece más «caliente» solo por tener más gente).
  const headcount: Record<string, number> = {};
  const values: Record<string, Record<string, number>> = {};
  for (const s of statuses) {
    const area = s.area ?? "Sin área";
    headcount[area] = (headcount[area] ?? 0) + 1;
    const pts = segmentsByEmployee[s.id] ?? [];
    for (const pt of pts) {
      if (pt.hours <= 0) continue;
      values[area] = values[area] ?? {};
      values[area][pt.key] = round2((values[area][pt.key] ?? 0) + pt.hours);
    }
  }
  for (const area of Object.keys(values)) {
    for (const k of Object.keys(values[area])) {
      values[area][k] = round2(values[area][k] / headcount[area]);
    }
  }
  const firstPts = segmentsByEmployee[statuses[0]?.id] ?? [];
  const heatmap: HeatmapData = {
    areas: byArea.map((a) => a.area).filter((a) => values[a]),
    segments: p.segments
      .filter((seg) => (p.cutoffDay > 0 ? seg.start.d <= p.cutoffDay : false))
      .map((seg) => ({
        key: seg.key,
        short: seg.short,
        label: seg.label,
        segmentTarget:
          firstPts.find((x) => x.key === seg.key)?.segmentTarget ??
          round2((RULES.WEEKLY_OVERTIME_LIMIT * seg.days) / 7),
      })),
    values,
    headcount,
  };

  const reincidentes: Reincidente[] = statuses
    .filter((s) => s.highWeeksMonth >= 2)
    .map((s) => ({
      id: s.id,
      name: s.name ?? s.code,
      area: s.area ?? "Sin área",
      level: s.level,
      weeksHigh: s.highWeeksMonth,
    }))
    .sort((a, b) => b.weeksHigh - a.weeksHigh);

  return {
    segmentsByEmployee,
    byArea,
    byDireccion,
    byPlant,
    trend,
    topEmployees,
    heatmap,
    reincidentes,
  };
}

export interface HistoryEntry {
  key: string;
  year: number;
  month: number;
  week: number;
  /** «1 al 6 de septiembre (6 días)». */
  label: string;
  /** null cuando el origen no trae horas totales (formato de novedades). */
  totalHours: number | null;
  baseHours: number | null;
  overtimeHours: number;
  /** Acumulado válido de su mes hasta este tramo (incluido). */
  monthToDate: number;
  /** Meta acumulada de su mes al final del tramo. */
  targetToDate: number;
  hasError: boolean;
  reviewStatus?: "corregido" | "descartado";
  errorReason?: string;
  estimated: boolean;
  isCurrentMonth: boolean;
}

export interface EmployeeDetail {
  employee: EmployeeInput;
  period: ResolvedPeriod;
  level: SemaphoreLevel;
  risk: RiskReason;
  reasons: string[];
  monthlyOvertime: number;
  target: number;
  overTarget: number;
  projectedMonthlyOvertime: number;
  projectionReliable: boolean;
  hasError: boolean;
  /** Registros del mes congelados y todavía sin revisar. */
  frozenCount: number;
  potentialMonthlyOvertime: number;
  highWeeksMonth: number;
  highWeeks: HighWeek[];
  weeklyOvertime: number;
  estimated: boolean;

  /** null si el mes solo tiene registros sin horas totales (novedades). */
  totalHoursMonth: number | null;
  baseHoursMonth: number | null;
  /** Tramos del mes con horas extra. */
  segmentsWithOvertime: number;

  /** Tramos del mes (incluye los que aún no tienen datos). */
  segments: SegmentPoint[];
  /** Historial por tramo del año, más reciente primero. */
  history: HistoryEntry[];

  areaRankPosition?: number;
  areaRankTotal?: number;

  /** Desglose de recargos del mes (formato real). */
  recargos?: {
    diurna: number;
    nocturna: number;
    dom_diurna: number;
    dom_nocturna: number;
  };
}

/** El registro trae horas totales reales (no es del formato de novedades). */
export function hasTotals(r: WeeklyRecord): boolean {
  return r.source !== "novedades";
}

/**
 * Detalle de un empleado: su estado del mes, sus tramos (curva acumulado vs
 * meta) y su historial del año.
 */
export function buildEmployeeDetail(
  status: EmployeeStatus,
  history: WeeklyRecord[],
  peers: EmployeeStatus[],
  period: Period
): EmployeeDetail {
  const p = resolvePeriod(period, history);
  const monthRecords = history.filter((r) => r.year === p.year && r.month === p.month);
  const validMonth = monthRecords.filter((r) => !r.hasError);
  const withTotals = validMonth.filter(hasTotals);
  const totalHoursMonth = withTotals.length
    ? round2(withTotals.reduce((a, r) => a + r.totalHours, 0))
    : null;
  const baseHoursMonth = withTotals.length
    ? round2(withTotals.reduce((a, r) => a + Math.min(r.totalHours, RULES.WEEKLY_BASE_HOURS), 0))
    : null;

  const segments = segmentPoints(p, history);

  // Historial por tramo (todos los meses del año que traiga `history`).
  const sorted = [...history].sort(
    (a, b) => a.year * 10000 + a.month * 100 + a.week - (b.year * 10000 + b.month * 100 + b.week)
  );
  const running = new Map<string, number>();
  const entries: HistoryEntry[] = sorted.map((r) => {
    const mk = `${r.year}-${r.month}`;
    const acc = round2((running.get(mk) ?? 0) + (r.hasError ? 0 : r.overtimeHours));
    running.set(mk, acc);
    const seg = monthSegments(r.year, r.month).find((s) => s.week === r.week);
    const totals = hasTotals(r);
    return {
      key: seg?.key ?? `${r.year}-${r.month}-w${r.week}`,
      year: r.year,
      month: r.month,
      week: r.week,
      label: seg?.label ?? `Semana ${r.week}`,
      totalHours: totals ? r.totalHours : null,
      baseHours: !totals ? null : r.hasError ? 0 : round2(Math.min(r.totalHours, RULES.WEEKLY_BASE_HOURS)),
      overtimeHours: r.overtimeHours,
      monthToDate: acc,
      targetToDate: seg ? monthlyTarget(seg.end.d) : 0,
      hasError: r.hasError,
      reviewStatus: r.reviewStatus,
      errorReason: r.errorReason,
      estimated: !!r.estimated,
      isCurrentMonth: r.year === p.year && r.month === p.month,
    };
  });

  const areaPeers = peers
    .filter((x) => (x.area ?? "") === (status.area ?? ""))
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);
  const areaRankPosition = areaPeers.findIndex((x) => x.id === status.id) + 1 || undefined;
  const areaRankTotal = areaPeers.length || undefined;

  return {
    employee: {
      id: status.id,
      code: status.code,
      name: status.name,
      area: status.area,
      direccion: status.direccion,
      costCenter: status.costCenter,
      plant: status.plant,
      roleTitle: status.roleTitle,
      managerId: status.managerId,
      managerName: status.managerName,
    },
    period: p,
    level: status.level,
    risk: status.risk,
    reasons: status.reasons,
    monthlyOvertime: status.monthlyOvertime,
    target: status.target,
    overTarget: status.overTarget,
    projectedMonthlyOvertime: status.projectedMonthlyOvertime,
    projectionReliable: status.projectionReliable,
    hasError: status.hasError,
    frozenCount: status.pendingReviewCount,
    potentialMonthlyOvertime: status.potentialMonthlyOvertime,
    highWeeksMonth: status.highWeeksMonth,
    highWeeks: status.highWeeks,
    weeklyOvertime: status.weeklyOvertime,
    estimated: status.estimated,
    totalHoursMonth,
    baseHoursMonth,
    segmentsWithOvertime: segments.filter((s) => s.hours > 0).length,
    segments,
    history: entries.reverse(),
    areaRankPosition,
    areaRankTotal,
  };
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}
