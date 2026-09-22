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
