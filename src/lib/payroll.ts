// Archivo de novedades de horas extra para nómina (un registro por persona y mes).
//
// Reglas:
// - Se suman solo las semanas válidas. Una semana congelada (pendiente o
//   descartada) se excluye, pero la persona sí sale con el resto de sus horas.
// - Formato para Excel en Colombia: separador «;», coma decimal y BOM UTF-8.
// - Las celdas de texto que empiezan por = + - @ se neutralizan (inyección de
//   fórmulas al abrir el archivo en una hoja de cálculo).

import type { EmployeeStatus } from "./aggregate";
import { RULES } from "./overtime";
import type { SemaphoreLevel, WeeklyRecord } from "./types";

export interface Recargos {
  diurna: number;
  nocturna: number;
  domDiurna: number;
  domNocturna: number;
}

export interface PayrollRow {
  code: string;
  name: string;
  area: string;
  costCenter: string;
  year: number;
  month: number;
  /** Horas extra válidas del mes (solo semanas no congeladas). */
  overtimeHours: number;
  recargos: Recargos;
  /** Semanas del mes congeladas y sin revisar: no se incluyen. */
  pendingWeeks: number;
  /** Semanas descartadas en la revisión: no se incluyen. */
  discardedWeeks: number;
  level: SemaphoreLevel;
  exceedsLimit: boolean;
}

export const LEVEL_LABEL: Record<SemaphoreLevel, string> = {
  green: "Normal",
  yellow: "En riesgo",
  red: "Excedido",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Filas de nómina de un mes. `recargos` es el desglose por empleado (id) de
 * las semanas válidas del mes, cuando el origen lo trae.
 */
export function buildPayrollRows(
  statuses: EmployeeStatus[],
  records: WeeklyRecord[],
  period: { year: number; month: number },
  recargos: Map<string, Recargos> = new Map()
): PayrollRow[] {
  const byEmp = new Map<string, WeeklyRecord[]>();
  for (const r of records) {
    if (r.year !== period.year || r.month !== period.month) continue;
    const arr = byEmp.get(r.employeeId);
    if (arr) arr.push(r);
    else byEmp.set(r.employeeId, [r]);
  }

  const rows: PayrollRow[] = [];
  for (const s of statuses) {
    const recs = byEmp.get(s.id) ?? [];
    const valid = recs.filter((r) => !r.hasError);
    const overtime = round2(valid.reduce((a, r) => a + r.overtimeHours, 0));
    const pendingWeeks = recs.filter((r) => r.hasError && !r.reviewStatus).length;
    const discardedWeeks = recs.filter(
      (r) => r.hasError && r.reviewStatus === "descartado"
    ).length;
    if (overtime <= 0 && pendingWeeks === 0) continue;
    rows.push({
      code: s.code,
      name: s.name ?? "",
      area: s.area ?? "",
      costCenter: s.costCenter ?? "",
      year: period.year,
      month: period.month,
      overtimeHours: overtime,
      recargos: recargos.get(s.id) ?? { diurna: 0, nocturna: 0, domDiurna: 0, domNocturna: 0 },
      pendingWeeks,
      discardedWeeks,
      level: s.level,
      exceedsLimit: overtime > RULES.MONTHLY_OVERTIME_LIMIT,
    });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
}

/** Neutraliza una celda de texto que una hoja de cálculo tomaría como fórmula. */
export function neutralizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function cell(value: string): string {
  const s = neutralizeFormula(value);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Número con coma decimal (configuración regional es-CO). */
function num(n: number): string {
  return round2(n).toFixed(2).replace(".", ",");
}

export const PAYROLL_HEADER = [
  "ID_Empleado",
  "Nombre",
  "Area",
  "Centro_Costo",
  "Anio",
  "Mes",
  "Horas_Extra_Validas",
  "Extra_Diurna",
  "Extra_Nocturna",
  "Dominical_Diurna",
  "Dominical_Nocturna",
  "Semanas_Por_Revisar",
  "Semanas_Descartadas",
  "Estado",
  "Supera_48h",
];

/** CSV con BOM UTF-8, «;» y coma decimal, listo para abrir en Excel es-CO. */
export function buildPayrollCsv(rows: PayrollRow[]): string {
  const lines = rows.map((r) =>
    [
      cell(r.code),
      cell(r.name),
      cell(r.area),
      cell(r.costCenter),
      String(r.year),
      String(r.month),
      num(r.overtimeHours),
      num(r.recargos.diurna),
      num(r.recargos.nocturna),
      num(r.recargos.domDiurna),
      num(r.recargos.domNocturna),
      String(r.pendingWeeks),
      String(r.discardedWeeks),
      LEVEL_LABEL[r.level],
      r.exceedsLimit ? "Sí" : "No",
    ].join(";")
  );
  return "﻿" + [PAYROLL_HEADER.join(";"), ...lines].join("\r\n") + "\r\n";
}

/** Totales para el resumen de la página y la bitácora de exportación. */
export function payrollTotals(rows: PayrollRow[]) {
  return {
    people: rows.filter((r) => r.overtimeHours > 0).length,
    hours: round2(rows.reduce((a, r) => a + r.overtimeHours, 0)),
    pendingPeople: rows.filter((r) => r.pendingWeeks > 0).length,
    pendingWeeks: rows.reduce((a, r) => a + r.pendingWeeks, 0),
    overLimit: rows.filter((r) => r.exceedsLimit).length,
  };
}
