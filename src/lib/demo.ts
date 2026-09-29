// Datos de demostración usados cuando Supabase no está configurado.
// Permiten ejecutar y evaluar la aplicación de inmediato.

import { buildPayrollRows } from "./payroll";
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

// Junio de 2026 (30 días, empieza lunes): tramos 1–7, 8–14, 15–21, 22–28 y
// 29–30. La demo tiene datos hasta el 21 de junio: meta acumulada 36,0h.
export const DEMO_PERIOD: Period = {
  year: 2026,
  month: 6,
  week: 25,
  status: "abierto",
  daysInMonth: 30,
  cutoffDay: 21,
};

export const demoEmployees: EmployeeInput[] = [
  { id: "e1", code: "1001", name: "Ana Restrepo", area: "PRODUCCIÓN RIONEGRO", direccion: "Concretos", plant: "Rionegro", costCenter: "CA7CA00120-PRODUCCIÓN RIONEGRO", roleTitle: "Operaria", managerId: "m1", managerName: "Jefe Producción" },
  { id: "e2", code: "1002", name: "Carlos Gómez", area: "PRODUCCIÓN RIONEGRO", direccion: "Concretos", plant: "Rionegro", costCenter: "CA7CA00120-PRODUCCIÓN RIONEGRO", roleTitle: "Operario", managerId: "m1", managerName: "Jefe Producción" },
  { id: "e3", code: "1003", name: "Diana Torres", area: "CALIDAD RIONEGRO", direccion: "Concretos", plant: "Rionegro", costCenter: "CA7CA00122-CALIDAD RIONEGRO", roleTitle: "Operaria", managerId: "m1", managerName: "Jefe Producción" },
  { id: "e4", code: "2001", name: "Esteban Ruiz", area: "MANTENIMIENTO", direccion: "Dirección Industrial", plant: "Río Claro", costCenter: "EC7EC00010-MANTENIMIENTO", roleTitle: "Operario", managerId: "m2", managerName: "Jefe Logística" },
  { id: "e5", code: "2002", name: "Fernanda Díaz", area: "LOGÍSTICA", direccion: "Dirección Comercial", plant: "Río Claro", costCenter: "EC4000000-LOGÍSTICA", roleTitle: "Operaria", managerId: "m2", managerName: "Jefe Logística" },
  { id: "e6", code: "3001", name: "Gustavo León", area: "PRODUCCIÓN", direccion: "Dirección Industrial", plant: "Bello", costCenter: "EC7EC00020-PRODUCCIÓN", roleTitle: "Técnico", managerId: "m3", managerName: "Jefe Mantenimiento" },
];

// Junio de 2026, tramos del 1 al 21 (semanas ISO 23, 24 y 25).
export const demoRecords: WeeklyRecord[] = [
  // Ana -> Normal (32h frente a 36h) con una semana de más de 12h (15–21 jun).
  rec("e1", 23, 6, 50), // 8 extra
  rec("e1", 24, 6, 52), // 10 extra
  rec("e1", 25, 6, 56), // 14 extra

  // Carlos -> En riesgo por meta: 38h frente a 36h al 21 de junio.
  rec("e2", 23, 6, 58), // 16
  rec("e2", 24, 6, 50), // 8
  rec("e2", 25, 6, 56), // 14

  // Diana -> registro congelado por horas huérfanas (turno de 20h).
  rec("e3", 23, 6, 48), // 6
  { ...rec("e3", 24, 6, 90, true), maxShiftHours: 20 },
  rec("e3", 25, 6, 44), // 2

  // Esteban -> Normal, pocas horas.
  rec("e4", 23, 6, 42),
  rec("e4", 24, 6, 43),
  rec("e4", 25, 6, 44), // 2

  // Fernanda -> En riesgo por proyección: 35h (dentro de la meta de 36h),
  // pero a este ritmo cerraría en 50h.
  rec("e5", 23, 6, 54), // 12
  rec("e5", 24, 6, 53), // 11
  rec("e5", 25, 6, 54), // 12

  // Gustavo -> Excedido: 52h en el mes.
  rec("e6", 23, 6, 60), // 18
  rec("e6", 24, 6, 60), // 18
  rec("e6", 25, 6, 58), // 16
];

// El "jefe" de la demostración gestiona al equipo de Producción (manager m1).
const DEMO_JEFE_MANAGER = "m1";
// El "director" de la demostración ve la Dirección Industrial.
export const DEMO_DIRECTOR_DIRECCION = "Dirección Industrial";

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
 * - director: solo su dirección.
 * - rrhh: toda la organización.
 */
export function demoDashboard(roleView: Role, filters: Filters = {}): DemoDashboard {
  // Alcance por rol (v2): RRHH ve todo, el director su dirección y el jefe su
  // equipo directo.
  const scope =
    roleView === "jefe"
      ? demoEmployees.filter((e) => e.managerId === DEMO_JEFE_MANAGER)
      : roleView === "director"
        ? demoEmployees.filter((e) => e.direccion === DEMO_DIRECTOR_DIRECCION)
        : demoEmployees;

  const filterOptions = buildFilterOptions(scope, filters);
  const employees = applyFilters(scope, filters);

  const empIds = new Set(employees.map((e) => e.id));
  const records = demoRecords.filter((r) => empIds.has(r.employeeId));

  const period: Period = DEMO_PERIOD;
  const statuses = computeEmployeeStatuses(employees, records, period);
  return {
    statuses,
    summary: summarize(statuses),
    charts: computeDashboardCharts(statuses, records, period),
    period,
    roleView,
    filters,
    filterOptions,
  };
}

/** Filas de nómina del demo (datos ficticios), respetando el alcance del rol. */
export function demoPayrollRows(roleView: Role) {
  const { statuses, period } = demoDashboard(roleView);
  return { period, rows: buildPayrollRows(statuses, demoRecords, period) };
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
