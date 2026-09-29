// Reglas de negocio y lógica legal para el control de horas extras (ALION).
//
// Fuente: Especificación técnica ALION.
//  - Jornada base: 42 horas semanales regulares.
//  - Alerta semanal: > 12 horas extras de lunes a domingo (informativa).
//  - Límite mensual: 48 horas extras. Meta acumulada: 12h por semana,
//    proporcional en semanas parciales, con tope de 48h.
//  - Horas huérfanas: turnos de más de 16h seguidas sin marcación de salida ->
//    el registro se congela y se marca con error (no suma al acumulado).

import type { BiometricRow, SemaphoreLevel, WeeklyRecord } from "./types";

/** Parámetros legales/operativos. Centralizados para facilitar ajustes. */
export const RULES = {
  /** Jornada regular semanal (horas). */
  WEEKLY_BASE_HOURS: 42,
  /**
   * Referencia semanal: 12h extra de lunes a domingo. Superarla genera la
   * alerta «Semana > 12h» (informativa) y es la meta de una semana completa.
   */
  WEEKLY_OVERTIME_LIMIT: 12,
  /** Límite de horas extras por mes (no puede superarse). */
  MONTHLY_OVERTIME_LIMIT: 48,
  /** Días de datos a partir de los cuales la proyección cambia el estado. */
  MIN_DAYS_FOR_PROJECTION: 7,
  /** Duración de turno (horas) a partir de la cual se considera "hora huérfana". */
  ORPHAN_SHIFT_HOURS: 16,
} as const;

/**
 * Calcula las horas extras a partir de las horas totales trabajadas en la semana.
 * Todo lo que supere la jornada base son extras. Nunca es negativo.
 */
export function calculateWeeklyOvertime(totalHours: number): number {
  if (!Number.isFinite(totalHours) || totalHours <= 0) return 0;
  return round2(Math.max(0, totalHours - RULES.WEEKLY_BASE_HOURS));
}

/**
 * Detecta "horas huérfanas": turnos de más de 16h seguidas sin marcación de
 * salida. Devuelve el motivo si el registro debe congelarse, o null si es válido.
 */
export function detectOrphanHours(row: BiometricRow): string | null {
  if (row.maxShiftHours != null && row.maxShiftHours > RULES.ORPHAN_SHIFT_HOURS) {
    return `Turno de ${round2(row.maxShiftHours)}h supera el máximo de ${
      RULES.ORPHAN_SHIFT_HOURS
    }h sin marcación de salida.`;
  }
  return null;
}

/**
 * Convierte una fila biométrica cruda en un registro semanal consolidado,
 * aplicando la detección de horas huérfanas. Un registro congelado (error)
 * no aporta horas extras al acumulado.
 */
export function buildWeeklyRecord(
  row: BiometricRow,
  meta: { year: number; week: number; month: number; isPartial: boolean }
): WeeklyRecord {
  const errorReason = detectOrphanHours(row);
  const hasError = errorReason != null;

  return {
    employeeId: row.employeeId,
    year: meta.year,
    week: meta.week,
    month: meta.month,
    totalHours: round2(row.totalHours),
    overtimeHours: hasError ? 0 : calculateWeeklyOvertime(row.totalHours),
    isPartial: meta.isPartial,
    hasError,
    errorReason: errorReason ?? undefined,
    maxShiftHours: row.maxShiftHours,
  };
}

/** Redondeo a 1 decimal: la cifra que ve el usuario (RF-09). */
export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** «17,0h»: horas con un decimal y coma decimal (es-CO). */
export function fmtH(n: number): string {
  return `${round1(n).toFixed(1).replace(".", ",")}h`;
}

/**
 * Meta acumulada al día `d` del mes (RF-07/RF-08): 12h por semana completa,
 * proporcional por día en las semanas parciales, con tope de 48h. En un mes de
 * 30 o 31 días la meta llega a 48h el día 28.
 */
export function monthlyTarget(d: number): number {
  if (d <= 0) return 0;
  return round2(
    Math.min(
      RULES.MONTHLY_OVERTIME_LIMIT,
      (RULES.WEEKLY_OVERTIME_LIMIT * d) / 7
    )
  );
}

/**
 * Proyección de cierre (RF-18/RF-19): extiende el ritmo diario hasta el final
 * del mes. Nunca es menor que el acumulado; en un mes cerrado es el acumulado.
 */
export function projectClose(
  accumulated: number,
  cutoffDay: number,
  daysInMonth: number,
  closed = false
): number {
  const a = Math.max(0, accumulated);
  if (closed || cutoffDay <= 0 || cutoffDay >= daysInMonth) return round2(a);
  return round2(Math.max(a, (a * daysInMonth) / cutoffDay));
}

export type RiskReason = "meta" | "proyeccion" | null;

export interface MonthEvaluation {
  level: SemaphoreLevel;
  /** Motivo de «En riesgo» (o null si no lo está). */
  risk: RiskReason;
  /** Meta acumulada a la fecha de corte. */
  target: number;
  /** Horas por encima de la meta (0 si está dentro). */
  overTarget: number;
  projected: number;
  /** true con al menos 7 días de datos: la proyección puede decidir el estado. */
  projectionReliable: boolean;
  reasons: string[];
}

/**
 * Estado del mes (RF-11 a RF-13):
 *  - Excedido (red): acumulado > 48h.
 *  - En riesgo (yellow): acumulado > meta a la fecha de corte, o proyección
 *    > 48h con al menos 7 días de datos.
 *  - Normal (green): en otro caso.
 * Las comparaciones usan las cifras redondeadas a 1 decimal, las que se leen.
 */
export function evaluateMonth(input: {
  accumulated: number;
  cutoffDay: number;
  daysInMonth: number;
  closed?: boolean;
  /** «7 de febrero», para los textos. */
  cutoffLabel?: string;
}): MonthEvaluation {
  const { accumulated, cutoffDay, daysInMonth, closed = false } = input;
  const at = input.cutoffLabel ? ` al ${input.cutoffLabel}` : "";
  const a = round1(accumulated);
  const target = monthlyTarget(cutoffDay);
  // Se proyecta desde la cifra que se lee, para que estado y texto coincidan.
  const projected = projectClose(a, cutoffDay, daysInMonth, closed);
  const projectionReliable = !closed && cutoffDay >= RULES.MIN_DAYS_FOR_PROJECTION;
  const overTarget = round2(Math.max(0, a - round1(target)));
  const limit = RULES.MONTHLY_OVERTIME_LIMIT;

  if (a > limit) {
    return {
      level: "red",
      risk: null,
      target,
      overTarget,
      projected,
      projectionReliable,
      reasons: [`Superó el límite de ${limit}h del mes: lleva ${fmtH(a)}.`],
    };
  }
  if (overTarget > 0) {
    return {
      level: "yellow",
      risk: "meta",
      target,
      overTarget,
      projected,
      projectionReliable,
      reasons: [
        `${fmtH(overTarget)} por encima de la meta${at}: lleva ${fmtH(a)} y la meta es ${fmtH(target)}.`,
      ],
    };
  }
  if (projectionReliable && round1(projected) > limit) {
    return {
      level: "yellow",
      risk: "proyeccion",
      target,
      overTarget,
      projected,
      projectionReliable,
      reasons: [
        `Va dentro de la meta${at}, pero a este ritmo cerraría en ${fmtH(projected)}.`,
      ],
    };
  }
  return {
    level: "green",
    risk: null,
    target,
    overTarget,
    projected,
    projectionReliable,
    reasons: [
      closed
        ? `Cerró el mes en ${fmtH(a)}, dentro del límite de ${limit}h.`
        : `Dentro de la meta${at}.`,
    ],
  };
}

/** Suma las horas extras de un conjunto de registros semanales (ignora errores). */
export function sumOvertime(records: WeeklyRecord[]): number {
  return round2(
    records.reduce((acc, r) => acc + (r.hasError ? 0 : r.overtimeHours), 0)
  );
}

/** Redondeo a 2 decimales estable. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
