// Reglas de negocio y lógica legal para el control de horas extras (ALION).
//
// Fuente: Especificación técnica ALION.
//  - Jornada base: 42 horas semanales regulares.
//  - Alerta semanal: > 12 horas extras en una misma semana.
//  - Límite legal mensual: 48 horas extras al mes.
//  - Horas huérfanas: turnos de más de 16h seguidas sin marcación de salida ->
//    el registro se congela y se marca con error (no suma al acumulado).
//  - Semáforo preventivo: cerca del límite semanal (10h) o mensual (40h).

import type {
  BiometricRow,
  MonthProjection,
  SemaphoreLevel,
  StatusEvaluation,
  WeeklyProjection,
  WeeklyRecord,
} from "./types";

/** Parámetros legales/operativos. Centralizados para facilitar ajustes. */
export const RULES = {
  /** Jornada regular semanal (horas). */
  WEEKLY_BASE_HOURS: 42,
  /** Límite legal de horas extras por semana antes de alerta crítica. */
  WEEKLY_OVERTIME_LIMIT: 12,
  /** Umbral preventivo de horas extras semanales (amarillo). */
  WEEKLY_OVERTIME_WARNING: 10,
  /** Límite legal de horas extras por mes. */
  MONTHLY_OVERTIME_LIMIT: 48,
  /** Umbral preventivo de horas extras mensuales (amarillo). */
  MONTHLY_OVERTIME_WARNING: 40,
  /** Duración de turno (horas) a partir de la cual se considera "hora huérfana". */
  ORPHAN_SHIFT_HOURS: 16,
  /** Días laborales considerados por semana para la proyección (burn rate). */
  WORKING_DAYS_PER_WEEK: 6,
  /** Semanas promedio por mes, para proyectar el cierre mensual. */
  WEEKS_PER_MONTH: 4.345,
  /** Máximo de horas extra por solicitud de autorización. */
  MAX_AUTHORIZATION_HOURS: 5,
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

/**
 * Proyección por burn rate a partir de un corte parcial.
 * Estima el total y las extras al cierre de la semana según el promedio diario
 * observado hasta el día del corte.
 *
 * @param hoursSoFar  Horas acumuladas hasta el corte parcial.
 * @param daysElapsed Días transcurridos de la semana incluidos en el corte.
 */
export function projectWeek(
  hoursSoFar: number,
  daysElapsed: number
): WeeklyProjection {
  const safeDays = Math.max(1, Math.min(daysElapsed, RULES.WORKING_DAYS_PER_WEEK));
  const dailyAverage = hoursSoFar / safeDays;
  const projectedTotalHours = round2(dailyAverage * RULES.WORKING_DAYS_PER_WEEK);
  const projectedOvertimeHours = calculateWeeklyOvertime(projectedTotalHours);

  return {
    dailyAverage: round2(dailyAverage),
    projectedTotalHours,
    projectedOvertimeHours,
    willExceedWeeklyLimit: projectedOvertimeHours > RULES.WEEKLY_OVERTIME_LIMIT,
  };
}

/**
 * Proyección de cierre de MES (burn rate mensual). A partir de las horas extra
 * acumuladas y el número de semanas transcurridas, estima el total del mes.
 */
export function projectMonth(
  monthlyOvertimeSoFar: number,
  weeksElapsed: number
): MonthProjection {
  if (weeksElapsed <= 0) {
    return {
      weeksElapsed: 0,
      projectedMonthlyOvertime: round2(Math.max(0, monthlyOvertimeSoFar)),
      willExceedMonthly: monthlyOvertimeSoFar > RULES.MONTHLY_OVERTIME_LIMIT,
    };
  }
  const avg = monthlyOvertimeSoFar / weeksElapsed;
  const projected = round2(avg * RULES.WEEKS_PER_MONTH);
  return {
    weeksElapsed,
    projectedMonthlyOvertime: projected,
    willExceedMonthly: projected > RULES.MONTHLY_OVERTIME_LIMIT,
  };
}

/**
 * Evalúa el semáforo. Regla ALIÓN: el límite DURO es el MENSUAL (48h). Superar
 * las 12h de una semana está PERMITIDO (solo es informativo); lo que no puede
 * superarse es el acumulado del mes.
 *
 * 🔴 Rojo (crítico): superó las 48h extra del mes.
 * 🟡 Amarillo (preventivo): cerca del límite mensual (>=40h) o la proyección de
 *     cierre lo superaría.
 * 🟢 Verde: operación normal.
 */
export function evaluateStatus(
  monthlyOvertime: number,
  projectedMonthlyOvertime: number | null = null,
  weeklyOvertime = 0
): StatusEvaluation {
  const reasons: string[] = [];

  const monthlyExceeded = monthlyOvertime > RULES.MONTHLY_OVERTIME_LIMIT;
  const monthlyWarning = monthlyOvertime >= RULES.MONTHLY_OVERTIME_WARNING;
  const willExceedMonthly =
    projectedMonthlyOvertime != null &&
    projectedMonthlyOvertime > RULES.MONTHLY_OVERTIME_LIMIT;
  const weeklyHigh = weeklyOvertime > RULES.WEEKLY_OVERTIME_LIMIT;

  let level: SemaphoreLevel = "green";

  if (monthlyExceeded) {
    level = "red";
    reasons.push(
      `Superó el límite legal mensual: ${round2(monthlyOvertime)}h > ${
        RULES.MONTHLY_OVERTIME_LIMIT
      }h.`
    );
  } else if (monthlyWarning || willExceedMonthly) {
    level = "yellow";
    if (monthlyWarning) {
      reasons.push(
        `Cerca del límite mensual: ${round2(monthlyOvertime)}h (umbral ${
          RULES.MONTHLY_OVERTIME_WARNING
        }h).`
      );
    }
    if (willExceedMonthly) {
      reasons.push(
        `Proyección de cierre: ${round2(
          projectedMonthlyOvertime as number
        )}h — superaría las ${RULES.MONTHLY_OVERTIME_LIMIT}h.`
      );
    }
  } else {
    reasons.push("Operación normal.");
  }

  if (weeklyHigh) {
    reasons.push(
      `Semana alta: ${round2(weeklyOvertime)}h extra (permitido; el límite es mensual).`
    );
  }

  return {
    level,
    reasons,
    weeklyOvertime: round2(weeklyOvertime),
    monthlyOvertime: round2(monthlyOvertime),
    weeklyHigh,
    monthlyExceeded,
    willExceedMonthly,
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
