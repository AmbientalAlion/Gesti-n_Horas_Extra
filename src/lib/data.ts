// Capa de acceso a datos para los dashboards (Server Components).
// Usa Supabase cuando está configurado; de lo contrario, datos demo.

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
import { DEMO_PERIOD, demoEmployees, demoRecords, isSupabaseConfigured } from "./demo";
import { createClient } from "./supabase/server";
import { currentPeriodInfo, cutoffDay, periodForMonth, todayInPlant } from "./dates";
import { buildPayrollRows, type PayrollRow, type Recargos } from "./payroll";
import type { Role, WeeklyRecord } from "./types";

export type { Filters, FilterOptions } from "./aggregate";

export interface DashboardData {
  statuses: EmployeeStatus[];
  summary: PlantSummary;
  charts: DashboardCharts;
  period: Period;
  demo: boolean;
  role: Role | "demo";
  filters: Filters;
  filterOptions: FilterOptions;
}

export interface SessionProfile {
  id: string;
  email: string;
  fullName: string | null;
  /** null = cuenta sin rol asignado: no ve datos. */
  role: Role | null;
}

/** Devuelve el perfil del usuario autenticado, o null si no hay sesión. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: (profile.role as Role | null) ?? null,
  };
}

/**
 * Páginas solo para Recursos Humanos (cargar, exportar, revisar, usuarios).
 * Sin Supabase (modo demostración) no aplica.
 */
export async function requireRrhh(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { redirect } = await import("next/navigation");
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile!.role !== "rrhh") redirect("/dashboard");
}

/**
 * Obtiene los datos del dashboard para el periodo indicado (por defecto el actual).
 * El alcance se aplica por RLS en Supabase (un jefe solo ve su equipo).
 */
// Registros del último getDashboardData (misma petición): los usa la
// exportación a nómina sin volver a consultarlos.
let lastRecords: WeeklyRecord[] = [];

export async function getDashboardData(
  period?: Period,
  filters: Filters = {}
): Promise<DashboardData> {
  const p = period ?? currentPeriod();

  if (!isSupabaseConfigured()) {
    const filterOptions = buildFilterOptions(demoEmployees, filters);
    const emps = applyFilters(demoEmployees, filters);
    const ids = new Set(emps.map((e) => e.id));
    const recs = demoRecords.filter((r) => ids.has(r.employeeId));
    const dp: Period = DEMO_PERIOD;
    const statuses = computeEmployeeStatuses(emps, recs, dp);
    lastRecords = recs;
    return {
      statuses,
      summary: summarize(statuses),
      charts: computeDashboardCharts(statuses, recs, dp),
      period: dp,
      demo: true,
      role: "demo",
      filters,
      filterOptions,
    };
  }

  const supabase = createClient();
  const profile = await getSessionProfile();

  const { data: employeesRaw } = await supabase
    .from("employees")
    .select(
      "id, code, name, role_title, area, direccion, cost_center, plant, manager_id, manager_name, profiles:manager_id (full_name)"
    )
    .eq("active", true);

  const employees: EmployeeInput[] = (employeesRaw ?? []).map((e: any) => ({
    id: e.id,
    code: e.code,
    name: e.name ?? undefined,
    area: e.area ?? undefined,
    direccion: e.direccion ?? undefined,
    costCenter: e.cost_center ?? undefined,
    plant: e.plant ?? undefined,
    roleTitle: e.role_title ?? undefined,
    managerId: e.manager_id ?? undefined,
    managerName: e.manager_name ?? e.profiles?.full_name ?? undefined,
  }));

  const { data: recordsRaw } = await supabase
    .from("weekly_records")
    .select(
      "employee_id, year, week, month, total_hours, overtime_hours, is_partial, has_error, error_reason, max_shift_hours, review_status, source, last_date, estimated"
    )
    .or(neighbourMonthsFilter(p.year, p.month));

  const records: WeeklyRecord[] = (recordsRaw ?? []).map((r: any) => ({
    employeeId: r.employee_id,
    year: r.year,
    week: r.week,
    month: r.month,
    totalHours: r.total_hours != null ? Number(r.total_hours) : 0,
    overtimeHours: Number(r.overtime_hours),
    isPartial: r.is_partial,
    hasError: r.has_error,
    errorReason: r.error_reason ?? undefined,
    maxShiftHours: r.max_shift_hours != null ? Number(r.max_shift_hours) : undefined,
    reviewStatus: r.review_status ?? undefined,
    source: r.source ?? (r.total_hours == null ? "novedades" : "biometrico"),
    lastDate: r.last_date ?? undefined,
    estimated: r.estimated ?? false,
  }));

  const filterOptions = buildFilterOptions(employees, filters);
  const filteredEmployees = applyFilters(employees, filters);
  const ids = new Set(filteredEmployees.map((e) => e.id));
  const filteredRecords = records.filter((r) => ids.has(r.employeeId));

  // Cobertura del mes sobre TODOS los registros visibles (no solo los
  // filtrados): así el ritmo de la proyección no depende de los filtros.
  const pc: Period = {
    ...p,
    cutoffDay: p.cutoffDay ?? cutoffDay(records, p.year, p.month, todayInPlant()),
  };
  lastRecords = filteredRecords;
  const statuses = computeEmployeeStatuses(filteredEmployees, filteredRecords, pc);
  return {
    statuses,
    summary: summarize(statuses),
    charts: computeDashboardCharts(statuses, filteredRecords, pc),
    period: pc,
    demo: false,
    role: profile?.role ?? "jefe",
    filters,
    filterOptions,
  };
}

/**
 * Detalle de un empleado (identidad, horas disponibles, historial, tendencia,
 * ranking). Devuelve null si el empleado no existe o está fuera del alcance.
 */
export async function getEmployeeDetail(
  id: string,
  month?: { year: number; month: number }
): Promise<EmployeeDetail | null> {
  const period = month ? periodFromInfo(periodForMonth(month.year, month.month)) : currentPeriod();

  if (!isSupabaseConfigured()) {
    // Modo demo (área autenticada sin Supabase): usar dataset de ejemplo.
    const { demoDashboard, demoRecords } = await import("./demo");
    const dash = demoDashboard("rrhh");
    const status = dash.statuses.find((s) => s.id === id);
    if (!status) return null;
    const history = demoRecords.filter((r) => r.employeeId === id);
    return buildEmployeeDetail(status, history, dash.statuses, dash.period);
  }

  const dash = await getDashboardData(period);
  const status = dash.statuses.find((s) => s.id === id);
  if (!status) return null; // fuera de alcance (RLS) o inexistente

  const supabase = createClient();
  const { data: recordsRaw } = await supabase
    .from("weekly_records")
    .select(
      "employee_id, year, week, month, total_hours, overtime_hours, is_partial, has_error, error_reason, max_shift_hours, review_status, source, last_date, estimated, ot_extra_diurna, ot_extra_nocturna, ot_dom_diurna, ot_dom_nocturna"
    )
    .eq("employee_id", id)
    .in("year", [period.year - 1, period.year, period.year + 1]);

  const raw = recordsRaw ?? [];
  const history: WeeklyRecord[] = raw.map((r: any) => ({
    employeeId: r.employee_id,
    year: r.year,
    week: r.week,
    month: r.month,
    totalHours: r.total_hours != null ? Number(r.total_hours) : 0,
    overtimeHours: Number(r.overtime_hours),
    isPartial: r.is_partial,
    hasError: r.has_error,
    errorReason: r.error_reason ?? undefined,
    maxShiftHours: r.max_shift_hours != null ? Number(r.max_shift_hours) : undefined,
    reviewStatus: r.review_status ?? undefined,
    source: r.source ?? (r.total_hours == null ? "novedades" : "biometrico"),
    lastDate: r.last_date ?? undefined,
    estimated: r.estimated ?? false,
  }));

  const detail = buildEmployeeDetail(status, history, dash.statuses, dash.period);

  // Desglose de recargos del mes (formato real).
  const monthRaw = raw.filter((r: any) => r.year === period.year && r.month === period.month);
  const rec = {
    diurna: sum(monthRaw, "ot_extra_diurna"),
    nocturna: sum(monthRaw, "ot_extra_nocturna"),
    dom_diurna: sum(monthRaw, "ot_dom_diurna"),
    dom_nocturna: sum(monthRaw, "ot_dom_nocturna"),
  };
  if (rec.diurna + rec.nocturna + rec.dom_diurna + rec.dom_nocturna > 0) {
    detail.recargos = rec;
  }

  return detail;
}

function sum(rows: any[], key: string): number {
  return Math.round(rows.reduce((a, r) => a + Number(r[key] ?? 0), 0) * 100) / 100;
}

/**
 * Periodo actual: semana ISO en curso en hora de Colombia y el mes al que se
 * imputa (mes de su jueves). Ver src/lib/dates.ts.
 */
function periodFromInfo(p: ReturnType<typeof periodForMonth>): Period {
  return { year: p.year, month: p.month, week: p.week, status: p.status, daysInMonth: p.daysInMonth };
}

export function currentPeriod(now: Date = new Date()): Period {
  const p = currentPeriodInfo(now);
  return { year: p.year, month: p.month, week: p.week, status: p.status, daysInMonth: p.daysInMonth };
}

export interface PayrollData {
  rows: PayrollRow[];
  period: Period;
  demo: boolean;
}

/**
 * Filas de nómina de un mes: horas válidas por persona (se excluyen semanas
 * congeladas, no personas) y desglose de recargos cuando el origen lo trae.
 */
export async function getPayrollData(year: number, month: number): Promise<PayrollData> {
  const info = periodForMonth(year, month);
  const base: Period = {
    year: info.year,
    month: info.month,
    week: info.week,
    status: info.status,
    daysInMonth: info.daysInMonth,
  };
  const dash = await getDashboardData(isSupabaseConfigured() ? base : undefined);
  const records = lastRecords;

  const recargos = new Map<string, Recargos>();
  if (!dash.demo) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weekly_records")
      .select("employee_id, ot_extra_diurna, ot_extra_nocturna, ot_dom_diurna, ot_dom_nocturna")
      .eq("year", dash.period.year)
      .eq("month", dash.period.month)
      .eq("has_error", false);
    if (error) throw new Error(`No se pudo leer el desglose de recargos: ${error.message}`);
    for (const r of data ?? []) {
      const cur = recargos.get(r.employee_id) ?? { diurna: 0, nocturna: 0, domDiurna: 0, domNocturna: 0 };
      cur.diurna += Number(r.ot_extra_diurna ?? 0);
      cur.nocturna += Number(r.ot_extra_nocturna ?? 0);
      cur.domDiurna += Number(r.ot_dom_diurna ?? 0);
      cur.domNocturna += Number(r.ot_dom_nocturna ?? 0);
      recargos.set(r.employee_id, cur);
    }
  }

  return {
    rows: buildPayrollRows(dash.statuses, records, dash.period, recargos),
    period: dash.period,
    demo: dash.demo,
  };
}

/**
 * Filtro PostgREST del mes y sus vecinos: las semanas que cruzan de mes
 * necesitan el tramo del otro mes para la alerta de 12h de lunes a domingo.
 */
function neighbourMonthsFilter(year: number, month: number): string {
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return [prev, { y: year, m: month }, next]
    .map((x) => `and(year.eq.${x.y},month.eq.${x.m})`)
    .join(",");
}
