// Agregaciones para los dashboards: combina empleados + registros semanales
// con la lógica de negocio para producir el estado (semáforo) y las métricas.

import { evaluateStatus, projectWeek, RULES, round2, sumOvertime } from "./overtime";
import type { SemaphoreLevel, WeeklyRecord } from "./types";

export interface EmployeeInput {
  id: string;
  code: string;
  name?: string;
  area?: string;
  roleTitle?: string;
  managerId?: string | null;
  managerName?: string;
}

export interface EmployeeStatus extends EmployeeInput {
  weeklyOvertime: number;
  monthlyOvertime: number;
  level: SemaphoreLevel;
  reasons: string[];
  weeklyAlert: boolean;
  hasError: boolean;
  /** Proyección de la semana actual si el último corte es parcial. */
  projectedWeeklyOvertime?: number;
  willExceedWeekly?: boolean;
}

export interface PlantSummary {
  totalEmployees: number;
  green: number;
  yellow: number;
  red: number;
  withErrors: number;
  totalMonthlyOvertime: number;
  weeklyAlerts: number;
}

export interface Period {
  year: number;
  month: number;
  week: number;
}

export interface HistoryEntry {
  year: number;
  week: number;
  month: number;
  totalHours: number;
  baseHours: number;
  overtimeHours: number;
  isPartial: boolean;
  hasError: boolean;
  errorReason?: string;
  maxShiftHours?: number;
  isCurrentMonth: boolean;
}

export interface EmployeeDetail {
  employee: EmployeeInput;
  period: Period;
  level: SemaphoreLevel;
  reasons: string[];
  weeklyAlert: boolean;
  monthlyExceeded: boolean;
  hasError: boolean;
  frozenCount: number;

  weeklyOvertime: number;
  monthlyOvertime: number;
  /** Horas extra disponibles antes de la alerta semanal (12h). */
  availableWeekly: number;
  /** Horas extra disponibles antes del límite legal mensual (48h). */
  availableMonthly: number;
  weeklyConsumptionPct: number;
  monthlyConsumptionPct: number;

  totalHoursMonth: number;
  baseHoursMonth: number;
  extraHoursMonth: number;
  avgWeeklyOvertime: number;
  weeksWorkedMonth: number;

  trend: "up" | "down" | "flat";
  trendDelta: number;

  projectedWeeklyOvertime?: number;
  willExceedWeekly?: boolean;

  history: HistoryEntry[];

  areaRankPosition?: number;
  areaRankTotal?: number;
}

/**
 * Construye el detalle completo de un empleado a partir de su estado (mes
 * actual), su historial de registros y sus pares del mismo alcance.
 */
export function buildEmployeeDetail(
  status: EmployeeStatus,
  history: WeeklyRecord[],
  peers: EmployeeStatus[],
  period: Period
): EmployeeDetail {
  const monthRecords = history.filter(
    (r) => r.year === period.year && r.month === period.month
  );
  const validMonth = monthRecords.filter((r) => !r.hasError);

  const totalHoursMonth = round2(
    validMonth.reduce((a, r) => a + r.totalHours, 0)
  );
  const baseHoursMonth = round2(
    validMonth.reduce((a, r) => a + Math.min(r.totalHours, RULES.WEEKLY_BASE_HOURS), 0)
  );
  const extraHoursMonth = status.monthlyOvertime;
  const weeksWorkedMonth = validMonth.length;
  const avgWeeklyOvertime = weeksWorkedMonth
    ? round2(extraHoursMonth / weeksWorkedMonth)
    : 0;

  const availableWeekly = round2(
    Math.max(0, RULES.WEEKLY_OVERTIME_LIMIT - status.weeklyOvertime)
  );
  const availableMonthly = round2(
    Math.max(0, RULES.MONTHLY_OVERTIME_LIMIT - status.monthlyOvertime)
  );
  const weeklyConsumptionPct = round2(
    (status.weeklyOvertime / RULES.WEEKLY_OVERTIME_LIMIT) * 100
  );
  const monthlyConsumptionPct = round2(
    (status.monthlyOvertime / RULES.MONTHLY_OVERTIME_LIMIT) * 100
  );

  // Tendencia: comparar la semana actual con la anterior (extra).
  const sorted = [...history].sort(
    (a, b) => a.year * 100 + a.week - (b.year * 100 + b.week)
  );
  const idxCurrent = sorted.findIndex(
    (r) => r.year === period.year && r.week === period.week
  );
  let trend: "up" | "down" | "flat" = "flat";
  let trendDelta = 0;
  if (idxCurrent > 0) {
    const cur = sorted[idxCurrent].hasError ? 0 : sorted[idxCurrent].overtimeHours;
    const prev = sorted[idxCurrent - 1].hasError
      ? 0
      : sorted[idxCurrent - 1].overtimeHours;
    trendDelta = round2(cur - prev);
    trend = trendDelta > 0.01 ? "up" : trendDelta < -0.01 ? "down" : "flat";
  }

  const historyEntries: HistoryEntry[] = sorted.map((r) => ({
    year: r.year,
    week: r.week,
    month: r.month,
    totalHours: r.totalHours,
    baseHours: r.hasError ? 0 : round2(Math.min(r.totalHours, RULES.WEEKLY_BASE_HOURS)),
    overtimeHours: r.overtimeHours,
    isPartial: r.isPartial,
    hasError: r.hasError,
    errorReason: r.errorReason,
    maxShiftHours: r.maxShiftHours,
    isCurrentMonth: r.year === period.year && r.month === period.month,
  }));

  // Ranking dentro del área (por horas extra del mes).
  const areaPeers = peers
    .filter((p) => (p.area ?? "") === (status.area ?? ""))
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);
  const areaRankPosition =
    areaPeers.findIndex((p) => p.id === status.id) + 1 || undefined;
  const areaRankTotal = areaPeers.length || undefined;

  return {
    employee: {
      id: status.id,
      code: status.code,
      name: status.name,
      area: status.area,
      roleTitle: status.roleTitle,
      managerId: status.managerId,
      managerName: status.managerName,
    },
    period,
    level: status.level,
    reasons: status.reasons,
    weeklyAlert: status.weeklyAlert,
    monthlyExceeded: status.monthlyOvertime > RULES.MONTHLY_OVERTIME_LIMIT,
    hasError: status.hasError,
    frozenCount: monthRecords.filter((r) => r.hasError).length,
    weeklyOvertime: status.weeklyOvertime,
    monthlyOvertime: status.monthlyOvertime,
    availableWeekly,
    availableMonthly,
    weeklyConsumptionPct,
    monthlyConsumptionPct,
    totalHoursMonth,
    baseHoursMonth,
    extraHoursMonth,
    avgWeeklyOvertime,
    weeksWorkedMonth,
    trend,
    trendDelta,
    projectedWeeklyOvertime: status.projectedWeeklyOvertime,
    willExceedWeekly: status.willExceedWeekly,
    history: historyEntries,
    areaRankPosition,
    areaRankTotal,
  };
}

/**
 * Calcula el estado de cada empleado para un periodo dado.
 * - weeklyOvertime: extras de la semana `period.week`.
 * - monthlyOvertime: suma de extras de todas las semanas del mes `period.month`.
 */
export function computeEmployeeStatuses(
  employees: EmployeeInput[],
  records: WeeklyRecord[],
  period: Period
): EmployeeStatus[] {
  const byEmployee = groupBy(records, (r) => r.employeeId);

  return employees.map((emp) => {
    const empRecords = byEmployee.get(emp.id) ?? [];

    const weekRecord = empRecords.find(
      (r) => r.year === period.year && r.week === period.week
    );
    const monthRecords = empRecords.filter(
      (r) => r.year === period.year && r.month === period.month
    );

    const weeklyOvertime = weekRecord?.hasError ? 0 : weekRecord?.overtimeHours ?? 0;
    const monthlyOvertime = sumOvertime(monthRecords);
    const hasError = monthRecords.some((r) => r.hasError);

    const status = evaluateStatus(weeklyOvertime, monthlyOvertime);

    let projectedWeeklyOvertime: number | undefined;
    let willExceedWeekly: boolean | undefined;
    if (weekRecord?.isPartial && !weekRecord.hasError) {
      // Corte parcial: proyectamos asumiendo el promedio observado.
      // Sin días explícitos, estimamos con la mitad de la semana laboral.
      const daysElapsed = Math.max(1, Math.round(RULES.WORKING_DAYS_PER_WEEK / 2));
      const proj = projectWeek(weekRecord.totalHours, daysElapsed);
      projectedWeeklyOvertime = proj.projectedOvertimeHours;
      willExceedWeekly = proj.willExceedWeeklyLimit;
    }

    return {
      ...emp,
      weeklyOvertime,
      monthlyOvertime,
      level: status.level,
      reasons: status.reasons,
      weeklyAlert: status.weeklyAlert,
      hasError,
      projectedWeeklyOvertime,
      willExceedWeekly,
    };
  });
}

/** Resumen agregado de toda la planta (o del alcance filtrado). */
export function summarize(statuses: EmployeeStatus[]): PlantSummary {
  return {
    totalEmployees: statuses.length,
    green: statuses.filter((s) => s.level === "green").length,
    yellow: statuses.filter((s) => s.level === "yellow").length,
    red: statuses.filter((s) => s.level === "red").length,
    withErrors: statuses.filter((s) => s.hasError).length,
    totalMonthlyOvertime: round2(
      statuses.reduce((acc, s) => acc + s.monthlyOvertime, 0)
    ),
    weeklyAlerts: statuses.filter((s) => s.weeklyAlert).length,
  };
}

export interface AreaOvertime {
  area: string;
  overtime: number;
  count: number;
  red: number;
}

export interface WeeklyTrendPoint {
  week: number;
  overtime: number;
  alerts: number;
}

export interface TopEmployee {
  id: string;
  name: string;
  overtime: number;
  level: SemaphoreLevel;
  area: string;
}

export interface DashboardCharts {
  byArea: AreaOvertime[];
  weeklyTrend: WeeklyTrendPoint[];
  topEmployees: TopEmployee[];
}

/** Datos derivados para las visualizaciones del dashboard. */
export function computeDashboardCharts(
  statuses: EmployeeStatus[],
  records: WeeklyRecord[],
  period: Period
): DashboardCharts {
  // Horas extra por área.
  const areaMap = new Map<string, AreaOvertime>();
  for (const s of statuses) {
    const area = s.area ?? "Sin área";
    const cur = areaMap.get(area) ?? { area, overtime: 0, count: 0, red: 0 };
    cur.overtime = round2(cur.overtime + s.monthlyOvertime);
    cur.count += 1;
    if (s.level === "red") cur.red += 1;
    areaMap.set(area, cur);
  }
  const byArea = [...areaMap.values()].sort((a, b) => b.overtime - a.overtime);

  // Tendencia semanal de horas extra (semanas del mes en curso).
  const weekMap = new Map<number, WeeklyTrendPoint>();
  for (const r of records) {
    if (r.month !== period.month || r.year !== period.year) continue;
    const cur = weekMap.get(r.week) ?? { week: r.week, overtime: 0, alerts: 0 };
    if (!r.hasError) {
      cur.overtime = round2(cur.overtime + r.overtimeHours);
      if (r.overtimeHours > RULES.WEEKLY_OVERTIME_LIMIT) cur.alerts += 1;
    }
    weekMap.set(r.week, cur);
  }
  const weeklyTrend = [...weekMap.values()].sort((a, b) => a.week - b.week);

  // Top empleados por horas extra del mes.
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

  return { byArea, weeklyTrend, topEmployees };
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
