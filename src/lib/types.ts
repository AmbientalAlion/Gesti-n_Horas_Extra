// Tipos de dominio para el control de horas extras de ALION

export type Role = "rrhh" | "director" | "jefe";

export type SemaphoreLevel = "green" | "yellow" | "red";

/** Fila cruda proveniente del CSV biométrico. */
export interface BiometricRow {
  employeeId: string;
  name?: string;
  role?: string;
  area?: string;
  /** Horas totales trabajadas en la semana (regulares + extras). */
  totalHours: number;
  /** Duración del turno más largo detectado (para horas huérfanas). */
  maxShiftHours?: number;
}

/** Registro semanal consolidado de un empleado. */
export interface WeeklyRecord {
  employeeId: string;
  /** Año ISO. */
  year: number;
  /** Número de semana ISO (1-53). */
  week: number;
  /** Mes (1-12) al que se imputa la semana, según su corte. */
  month: number;
  totalHours: number;
  overtimeHours: number;
  /** true si el corte es parcial (mitad de semana), false si es final (lunes). */
  isPartial: boolean;
  /** true si el registro tiene horas huérfanas y quedó congelado. */
  hasError: boolean;
  errorReason?: string;
  maxShiftHours?: number;
}

export interface WeeklyProjection {
  /** Promedio de horas por día observado en el corte parcial. */
  dailyAverage: number;
  /** Horas totales proyectadas al cierre de la semana. */
  projectedTotalHours: number;
  /** Horas extras proyectadas al cierre de la semana. */
  projectedOvertimeHours: number;
  /** true si se proyecta superar el límite semanal de extras. */
  willExceedWeeklyLimit: boolean;
}

export interface MonthlySummary {
  employeeId: string;
  year: number;
  month: number;
  totalOvertime: number;
  weeklyRecords: WeeklyRecord[];
  hasError: boolean;
}

export interface StatusEvaluation {
  level: SemaphoreLevel;
  reasons: string[];
  weeklyOvertime: number;
  monthlyOvertime: number;
  /** Informativo: superó 12h extra en la semana (PERMITIDO; el límite es mensual). */
  weeklyHigh: boolean;
  /** Crítico: superó el límite legal mensual de 48h (NO permitido). */
  monthlyExceeded: boolean;
  /** La proyección de cierre de mes superaría las 48h. */
  willExceedMonthly: boolean;
}

export interface MonthProjection {
  weeksElapsed: number;
  projectedMonthlyOvertime: number;
  willExceedMonthly: boolean;
}
