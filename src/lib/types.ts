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

/**
 * Horas de un empleado en un TRAMO: la parte de una semana ISO dentro de un
 * mes calendario. Una semana que cruza de mes produce dos registros.
 */
export interface WeeklyRecord {
  employeeId: string;
  /** Año calendario del mes del tramo. */
  year: number;
  /** Número de semana ISO (1-53) a la que pertenece el tramo. */
  week: number;
  /** Mes calendario (1-12) del tramo. */
  month: number;
  totalHours: number;
  overtimeHours: number;
  /** true si el corte es parcial (mitad de semana), false si es final (lunes). */
  isPartial: boolean;
  /** true si el registro tiene horas huérfanas y quedó congelado. */
  hasError: boolean;
  errorReason?: string;
  maxShiftHours?: number;
  /**
   * Resultado de la revisión de un registro congelado. Sin valor = pendiente.
   * "descartado" sigue con hasError (no suma) pero ya NO está por revisar.
   */
  reviewStatus?: "corregido" | "descartado";
  /**
   * Origen del registro. "novedades" solo trae horas extra por recargo: no hay
   * horas totales ni turno máximo (totalHours llega en 0 y no se muestra).
   */
  source?: "biometrico" | "novedades";
  /** Último día con datos del tramo (`yyyy-mm-dd`). */
  lastDate?: string;
  /**
   * true si las horas se repartieron por días porque el origen (archivo
   * semanal) no trae fechas y la semana cruza de mes (D-3).
   */
  estimated?: boolean;
}
