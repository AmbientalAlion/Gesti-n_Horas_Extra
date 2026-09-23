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
  role: Role;
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
    role: profile.role as Role,
  };
}

/**
 * Obtiene los datos del dashboard para el periodo indicado (por defecto el actual).
 * El alcance se aplica por RLS en Supabase (un jefe solo ve su equipo).
 */
export async function getDashboardData(
  period?: Period,
  filters: Filters = {}
): Promise<DashboardData> {
  const p = period ?? currentPeriod();

  if (!isSupabaseConfigured()) {
    const filterOptions = buildFilterOptions(demoEmployees);
    const emps = applyFilters(demoEmployees, filters);
    const ids = new Set(emps.map((e) => e.id));
    const recs = demoRecords.filter((r) => ids.has(r.employeeId));
    const statuses = computeEmployeeStatuses(emps, recs, DEMO_PERIOD);
    return {
      statuses,
      summary: summarize(statuses),
      charts: computeDashboardCharts(statuses, recs, DEMO_PERIOD),
      period: DEMO_PERIOD,
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
      "employee_id, year, week, month, total_hours, overtime_hours, is_partial, has_error, error_reason, max_shift_hours"
    )
    .eq("year", p.year)
    .eq("month", p.month);

  const records: WeeklyRecord[] = (recordsRaw ?? []).map((r: any) => ({
    employeeId: r.employee_id,
    year: r.year,
    week: r.week,
    month: r.month,
    totalHours: Number(r.total_hours),
    overtimeHours: Number(r.overtime_hours),
    isPartial: r.is_partial,
    hasError: r.has_error,
    errorReason: r.error_reason ?? undefined,
    maxShiftHours: r.max_shift_hours != null ? Number(r.max_shift_hours) : undefined,
  }));

  const filterOptions = buildFilterOptions(employees);
  const filteredEmployees = applyFilters(employees, filters);
  const ids = new Set(filteredEmployees.map((e) => e.id));
  const filteredRecords = records.filter((r) => ids.has(r.employeeId));

  const statuses = computeEmployeeStatuses(filteredEmployees, filteredRecords, p);
  return {
    statuses,
    summary: summarize(statuses),
    charts: computeDashboardCharts(statuses, filteredRecords, p),
    period: p,
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
  id: string
): Promise<EmployeeDetail | null> {
  const period = currentPeriod();

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
      "employee_id, year, week, month, total_hours, overtime_hours, is_partial, has_error, error_reason, max_shift_hours, ot_extra_diurna, ot_extra_nocturna, ot_dom_diurna, ot_dom_nocturna"
    )
    .eq("employee_id", id)
    .eq("year", period.year);

  const raw = recordsRaw ?? [];
  const history: WeeklyRecord[] = raw.map((r: any) => ({
    employeeId: r.employee_id,
    year: r.year,
    week: r.week,
    month: r.month,
    totalHours: Number(r.total_hours),
    overtimeHours: Number(r.overtime_hours),
    isPartial: r.is_partial,
    hasError: r.has_error,
    errorReason: r.error_reason ?? undefined,
    maxShiftHours: r.max_shift_hours != null ? Number(r.max_shift_hours) : undefined,
  }));

  const detail = buildEmployeeDetail(status, history, dash.statuses, dash.period);

  // Desglose de recargos del mes (formato real).
  const monthRaw = raw.filter((r: any) => r.month === period.month);
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

/** Periodo actual (año, mes, semana ISO) según la fecha del servidor. */
export function currentPeriod(): Period {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: now.getFullYear(), month: now.getMonth() + 1, week };
}
