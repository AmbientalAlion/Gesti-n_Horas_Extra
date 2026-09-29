// Calendario del negocio: UNA sola definición de fechas para toda la app.
//
// Reglas:
//  - La fecha de "hoy" es la de la planta (America/Bogota), no la del
//    servidor: Vercel corre en UTC y desde las 19:00 de Colombia ya sería
//    el día siguiente.
//  - Las semanas son ISO (lunes a domingo).
//  - Cada semana se imputa al mes de su JUEVES (la misma regla que usa la
//    carga del biométrico). Así una semana nunca se parte entre dos meses y
//    cada mes tiene 4 o 5 semanas completas.
//  - El año de un periodo es el año del jueves (= año ISO de la semana =
//    año del mes de imputación), por lo que semana, mes y año son coherentes.

export const PLANT_TZ = "America/Bogota";

/** Fecha civil (sin hora ni zona). `m` va de 1 a 12. */
export interface CivilDate {
  y: number;
  m: number;
  d: number;
}

export interface WeekInfo {
  /** Año ISO de la semana (= año del jueves = año del mes de imputación). */
  year: number;
  /** Semana ISO (1–53). */
  week: number;
  /** Mes de imputación (1–12): el mes en que cae el jueves de la semana. */
  month: number;
}

export interface MonthWeek extends WeekInfo {
  /** Lunes de la semana. */
  start: CivilDate;
  /** Domingo de la semana. */
  end: CivilDate;
}

const DAY_MS = 86_400_000;

function toUTC(c: CivilDate): Date {
  return new Date(Date.UTC(c.y, c.m - 1, c.d));
}

function fromUTC(d: Date): CivilDate {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

function addDays(c: CivilDate, n: number): CivilDate {
  return fromUTC(new Date(toUTC(c).getTime() + n * DAY_MS));
}

/** Compara dos fechas civiles (<0, 0, >0). */
export function compareDates(a: CivilDate, b: CivilDate): number {
  return toUTC(a).getTime() - toUTC(b).getTime();
}

/** Fecha civil de hoy en la zona horaria de la planta. */
export function todayInPlant(now: Date = new Date()): CivilDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLANT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Fecha civil a texto ISO `yyyy-mm-dd`. */
export function isoDate(c: CivilDate): string {
  return `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
}

/** Texto `yyyy-mm-dd` a fecha civil (o null si no es una fecha válida). */
export function parseIsoDate(s: string): CivilDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const c = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  const back = fromUTC(toUTC(c));
  return back.y === c.y && back.m === c.m && back.d === c.d ? c : null;
}

/** Día de la semana ISO: lunes = 1 … domingo = 7. */
export function isoWeekday(c: CivilDate): number {
  return toUTC(c).getUTCDay() || 7;
}

/** Jueves de la semana ISO que contiene la fecha. */
function thursdayOf(c: CivilDate): CivilDate {
  return addDays(c, 4 - isoWeekday(c));
}

/** Semana ISO de una fecha y el mes al que se imputa (mes del jueves). */
export function weekInfo(c: CivilDate): WeekInfo {
  const thu = thursdayOf(c);
  const yearStart = toUTC({ y: thu.y, m: 1, d: 1 }).getTime();
  const week = Math.ceil(((toUTC(thu).getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: thu.y, week, month: thu.m };
}

/** Los 7 días (lunes a domingo) de la semana ISO que contiene la fecha. */
export function weekDays(c: CivilDate): CivilDate[] {
  const monday = addDays(c, 1 - isoWeekday(c));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Semanas ISO imputadas a un mes: las que tienen su jueves dentro del mes.
 * Siempre son 4 o 5, completas y consecutivas.
 */
export function weeksOfMonth(year: number, month: number): MonthWeek[] {
  const out: MonthWeek[] = [];
  // Primer jueves del mes.
  let thu: CivilDate = { y: year, m: month, d: 1 };
  while (isoWeekday(thu) !== 4) thu = addDays(thu, 1);
  while (thu.m === month) {
    const info = weekInfo(thu);
    out.push({ ...info, start: addDays(thu, -3), end: addDays(thu, 3) });
    thu = addDays(thu, 7);
  }
  return out;
}

export type MonthStatus = "abierto" | "cerrado" | "futuro";

/** Estado de un mes frente a hoy: cerrado si ya terminaron todas sus semanas. */
export function monthStatus(year: number, month: number, today: CivilDate): MonthStatus {
  const weeks = weeksOfMonth(year, month);
  if (compareDates(weeks[weeks.length - 1].end, today) < 0) return "cerrado";
  if (compareDates(weeks[0].start, today) > 0) return "futuro";
  return "abierto";
}

export interface PeriodInfo extends WeekInfo {
  status: MonthStatus;
  /** Semanas que tiene el mes (4 o 5). */
  weeksInMonth: number;
  /** Lunes y domingo de la semana de referencia. */
  weekStart: CivilDate;
  weekEnd: CivilDate;
}

function toPeriodInfo(ref: MonthWeek, status: MonthStatus, weeksInMonth: number): PeriodInfo {
  return {
    year: ref.year,
    week: ref.week,
    month: ref.month,
    status,
    weeksInMonth,
    weekStart: ref.start,
    weekEnd: ref.end,
  };
}

/**
 * Periodo actual: la semana ISO en curso (hora de la planta) y el mes al que
 * se imputa. Ojo: los últimos días de un mes pueden pertenecer ya al
 * siguiente (p. ej. el 29-sep-2026 está en la semana 40, que es de octubre).
 */
export function currentPeriodInfo(now: Date = new Date()): PeriodInfo {
  const today = todayInPlant(now);
  const info = weekInfo(today);
  const weeks = weeksOfMonth(info.year, info.month);
  const ref = weeks.find((w) => w.week === info.week) ?? weeks[0];
  return toPeriodInfo(ref, "abierto", weeks.length);
}

/**
 * Periodo para un mes elegido. Semana de referencia: la actual si el mes está
 * abierto, la última si está cerrado y la primera si es futuro.
 */
export function periodForMonth(year: number, month: number, now: Date = new Date()): PeriodInfo {
  const cur = currentPeriodInfo(now);
  if (cur.year === year && cur.month === month) return cur;
  const weeks = weeksOfMonth(year, month);
  const status = monthStatus(year, month, todayInPlant(now));
  const ref = status === "futuro" ? weeks[0] : weeks[weeks.length - 1];
  return toPeriodInfo(ref, status, weeks.length);
}

/**
 * Cuántas semanas del mes ya tienen datos cargados: todas las semanas del mes
 * hasta la última que aparece en los registros. Una persona sin registro en
 * una semana cubierta hizo 0 horas extra esa semana (el archivo real solo trae
 * eventos), por eso la cobertura es del conjunto y no de cada persona.
 */
export function coveredWeeks(
  records: { year: number; month: number; week: number }[],
  year: number,
  month: number
): number {
  const weeks = weeksOfMonth(year, month);
  const inMonth = records.filter((r) => r.year === year && r.month === month);
  if (inMonth.length === 0) return 0;
  const last = Math.max(...inMonth.map((r) => r.week));
  return weeks.filter((w) => w.week <= last).length;
}

const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «28 sep – 4 oct» para mostrar el rango de una semana. */
export function formatWeekRange(start: CivilDate, end: CivilDate): string {
  const a = `${start.d} ${MES_CORTO[start.m - 1]}`;
  const b = `${end.d} ${MES_CORTO[end.m - 1]}`;
  return `${a} – ${b}`;
}

export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Iniciales de lunes a domingo. */
export const DOW = ["L", "M", "M", "J", "V", "S", "D"];

export interface PlantWeekDay {
  /** Fecha ISO `yyyy-mm-dd`. */
  date: string;
  /** Inicial del día (L, M, M, J, V, S, D). */
  dow: string;
  /** Día del mes. */
  day: number;
  isToday: boolean;
}

/** Los 7 días de la semana en curso en la planta (para el calendario de solicitudes). */
export function plantWeekDays(now: Date = new Date()): PlantWeekDay[] {
  const today = todayInPlant(now);
  return weekDays(today).map((c, i) => ({
    date: isoDate(c),
    dow: DOW[i],
    day: c.d,
    isToday: compareDates(c, today) === 0,
  }));
}

/** «J 1/10» a partir de `yyyy-mm-dd` (o null si no es una fecha válida). */
export function formatShortDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const c = parseIsoDate(iso);
  if (!c) return null;
  return `${DOW[isoWeekday(c) - 1]} ${c.d}/${c.m}`;
}
