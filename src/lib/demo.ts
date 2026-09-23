// Datos de demostración usados cuando Supabase no está configurado.
// Permiten ejecutar y evaluar la aplicación de inmediato.

import {
  applyFilters,
  buildEmployeeDetail,
  buildFilterOptions,
  computeDashboardCharts,
  computeEmployeeStatuses,
  summarize,
  type DashboardCharts,
  type EmployeeDetail,
  type EmployeeInput,
  type EmployeeStatus,
  type Filters,
  type FilterOptions,
  type Period,
  type PlantSummary,
} from "./aggregate";
import type { Role, WeeklyRecord } from "./types";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const DEMO_PERIOD = { year: 2026, month: 6, week: 25 };

export const demoEmployees: EmployeeInput[] = [
  { id: "e1", code: "1001", name: "Ana Restrepo", area: "PRODUCCIÓN RIONEGRO", direccion: "Concretos", plant: "Rionegro", costCenter: "CA7CA00120-PRODUCCIÓN RIONEGRO", roleTitle: "Operaria", managerId: "m1", managerName: "Jefe Producción" },
  { id: "e2", code: "1002", name: "Carlos Gómez", area: "PRODUCCIÓN RIONEGRO", direccion: "Concretos", plant: "Rionegro", costCenter: "CA7CA00120-PRODUCCIÓN RIONEGRO", roleTitle: "Operario", managerId: "m1", managerName: "Jefe Producción" },
  { id: "e3", code: "1003", name: "Diana Torres", area: "CALIDAD RIONEGRO", direccion: "Concretos", plant: "Rionegro", costCenter: "CA7CA00122-CALIDAD RIONEGRO", roleTitle: "Operaria", managerId: "m1", managerName: "Jefe Producción" },
  { id: "e4", code: "2001", name: "Esteban Ruiz", area: "MANTENIMIENTO", direccion: "Dirección Industrial", plant: "Río Claro", costCenter: "EC7EC00010-MANTENIMIENTO", roleTitle: "Operario", managerId: "m2", managerName: "Jefe Logística" },
  { id: "e5", code: "2002", name: "Fernanda Díaz", area: "LOGÍSTICA", direccion: "Dirección Comercial", plant: "Río Claro", costCenter: "EC4000000-LOGÍSTICA", roleTitle: "Operaria", managerId: "m2", managerName: "Jefe Logística" },
  { id: "e6", code: "3001", name: "Gustavo León", area: "PRODUCCIÓN", direccion: "Dirección Industrial", plant: "Bello", costCenter: "EC7EC00020-PRODUCCIÓN", roleTitle: "Técnico", managerId: "m3", managerName: "Jefe Mantenimiento" },
];

// Mes 6 de 2026, semanas 23, 24 y 25 (la 25 es la semana en curso).
export const demoRecords: WeeklyRecord[] = [
  // Ana -> 🔴 alerta semanal: 14h extra en la semana 25 (>12).
  rec("e1", 23, 6, 50), // 8 extra
  rec("e1", 24, 6, 52), // 10 extra
  rec("e1", 25, 6, 56), // 14 extra

  // Carlos -> 🟡 preventivo: 10h extra en la semana en curso.
  rec("e2", 23, 6, 46), // 4
  rec("e2", 24, 6, 46), // 4
  rec("e2", 25, 6, 52), // 10 (umbral amarillo semanal)

  // Diana -> ⚠️ registro congelado por horas huérfanas (turno 20h).
  rec("e3", 23, 6, 48), // 6
  { ...rec("e3", 24, 6, 90, true), maxShiftHours: 20 },
  rec("e3", 25, 6, 44), // 2

  // Esteban -> 🟢 operación normal.
  rec("e4", 23, 6, 42),
  rec("e4", 24, 6, 43),
  rec("e4", 25, 6, 44), // 2

  // Fernanda -> 🟡 corte parcial: proyección supera el umbral.
  rec("e5", 23, 6, 44),
  { ...rec("e5", 25, 6, 33), isPartial: true }, // 33h a mitad de semana

  // Gustavo -> 🔴 supera el límite legal mensual (>48h extra en el mes).
  rec("e6", 23, 6, 60), // 18
  rec("e6", 24, 6, 60), // 18
  rec("e6", 25, 6, 58), // 16  => 52 extra en el mes
];

// El "jefe" de la demostración gestiona al equipo de Producción (manager m1).
const DEMO_JEFE_MANAGER = "m1";

export interface DemoDashboard {
  statuses: EmployeeStatus[];
  summary: PlantSummary;
  charts: DashboardCharts;
  period: Period;
  roleView: Role;
  filters: Filters;
  filterOptions: FilterOptions;
}

/**
 * Datos del dashboard de demostración para una vista de rol, con filtros
 * globales opcionales (planta/área/jefe).
 * - jefe: solo su equipo directo (Producción).
 * - rrhh / director: toda la planta.
 */
export function demoDashboard(roleView: Role, filters: Filters = {}): DemoDashboard {
  const scope =
    roleView === "jefe"
      ? demoEmployees.filter((e) => e.managerId === DEMO_JEFE_MANAGER)
      : demoEmployees;

  const filterOptions = buildFilterOptions(scope);
  const employees = applyFilters(scope, filters);

  const empIds = new Set(employees.map((e) => e.id));
  const records = demoRecords.filter((r) => empIds.has(r.employeeId));

  const statuses = computeEmployeeStatuses(employees, records, DEMO_PERIOD);
  return {
    statuses,
    summary: summarize(statuses),
    charts: computeDashboardCharts(statuses, records, DEMO_PERIOD),
    period: DEMO_PERIOD,
    roleView,
    filters,
    filterOptions,
  };
}

/** Exporta las novedades depuradas del periodo demo para una vista de rol. */
export function demoExportRows(roleView: Role) {
  const { statuses, period } = demoDashboard(roleView);
  return {
    period,
    rows: statuses
      .filter((s) => !s.hasError && s.monthlyOvertime > 0)
      .map((s) => ({
        employeeId: s.code,
        name: s.name,
        area: s.area,
        year: period.year,
        month: period.month,
        week: period.week,
        overtimeHours: s.monthlyOvertime,
        status: s.level,
      })),
  };
}

/** Detalle de un empleado en el demo, respetando el alcance del rol. */
export function demoEmployeeDetail(
  id: string,
  roleView: Role
): EmployeeDetail | null {
  const dash = demoDashboard(roleView);
  const status = dash.statuses.find((s) => s.id === id);
  if (!status) return null;
  const history = demoRecords.filter((r) => r.employeeId === id);
  return buildEmployeeDetail(status, history, dash.statuses, dash.period);
}

function rec(
  employeeId: string,
  week: number,
  month: number,
  totalHours: number,
  hasError = false
): WeeklyRecord {
  const overtime = hasError ? 0 : Math.max(0, totalHours - 42);
  return {
    employeeId,
    year: 2026,
    week,
    month,
    totalHours,
    overtimeHours: overtime,
    isPartial: false,
    hasError,
    errorReason: hasError
      ? "Turno de 20h supera el máximo de 16h sin marcación de salida."
      : undefined,
    maxShiftHours: hasError ? 20 : undefined,
  };
}
