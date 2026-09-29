// Calendario del negocio: UNA sola definición de fechas para toda la app.
//
// Reglas (requerimientos v2):
//  - La fecha de "hoy" es la de la planta (America/Bogota), no la del
//    servidor: Vercel corre en UTC y desde las 19:00 de Colombia ya sería
//    el día siguiente.
//  - El mes de análisis es el mes CALENDARIO (del 1 al último día).
//  - Un TRAMO es la parte de una semana lunes–domingo que cae dentro del mes.
//    Un mes tiene de 4 a 6 tramos; el primero y el último pueden ser parciales.
//  - Los tramos se muestran por sus fechas («1 al 6 de septiembre»), nunca por
//    el número de semana.
//  - La alerta de 12h se mide sobre la semana completa (lunes a domingo). Una
//    semana que cruza de mes se cuenta en el mes donde tiene más días (el de
//    su jueves).

export const PLANT_TZ = "America/Bogota";

/** Fecha civil (sin hora ni zona). `m` va de 1 a 12. */
export interface CivilDate {
  y: number;
  m: number;
  d: number;
}

export interface WeekInfo {
  /** Año ISO de la semana (= año de su jueves). */
  year: number;
  /** Semana ISO (1–53). */
  week: number;
  /** Mes del jueves: el mes donde la semana tiene más días. */
  month: number;
}

/** Tramo: parte de una semana ISO dentro de un mes calendario. */
export interface Segment {
  /** Año y mes calendario del tramo. */
  year: number;
  month: number;
  /** Año y número de la semana ISO a la que pertenece. */
  isoYear: number;
  week: number;
  /** Clave estable «2026-09-w37». */
  key: string;
  start: CivilDate;
  end: CivilDate;
  /** Días del tramo dentro del mes (1–7). */
  days: number;
  partial: boolean;
  /** «1 al 6 de septiembre (6 días)». */
  label: string;
  /** «1–6 sep». */
  short: string;
}

const DAY_MS = 86_400_000;

function toUTC(c: CivilDate): Date {
  return new Date(Date.UTC(c.y, c.m - 1, c.d));
}

function fromUTC(d: Date): CivilDate {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

export function addDays(c: CivilDate, n: number): CivilDate {
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

/** Días que tiene un mes calendario. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Semana ISO de una fecha y el mes de su jueves. */
export function weekInfo(c: CivilDate): WeekInfo {
  const thu = addDays(c, 4 - isoWeekday(c));
  const yearStart = toUTC({ y: thu.y, m: 1, d: 1 }).getTime();
  const week = Math.ceil(((toUTC(thu).getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: thu.y, week, month: thu.m };
}

/** Lunes de una semana ISO. */
export function isoWeekMonday(isoYear: number, week: number): CivilDate {
  // El 4 de enero siempre está en la semana 1.
  const jan4: CivilDate = { y: isoYear, m: 1, d: 4 };
  const monday1 = addDays(jan4, 1 - isoWeekday(jan4));
  return addDays(monday1, (week - 1) * 7);
}

/** Los 7 días (lunes a domingo) de la semana ISO que contiene la fecha. */
export function weekDays(c: CivilDate): CivilDate[] {
  const monday = addDays(c, 1 - isoWeekday(c));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «Septiembre 2026». */
export function monthLabel(year: number, month: number): string {
  const m = MONTHS[month - 1];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
}

/** «20 de septiembre». */
export function formatDayLong(c: CivilDate): string {
  return `${c.d} de ${MONTHS[c.m - 1]}`;
}

/** «20 sep». */
export function formatDayShort(c: CivilDate): string {
  return `${c.d} ${MES_CORTO[c.m - 1]}`;
}

/** Clave estable de un tramo. */
export function segmentKey(year: number, month: number, week: number): string {
  return `${year}-${String(month).padStart(2, "0")}-w${week}`;
}

function buildSegment(year: number, month: number, start: CivilDate, end: CivilDate): Segment {
  const w = weekInfo(start);
  const days = end.d - start.d + 1;
  const partial = days < 7;
  const range = start.d === end.d ? `${start.d}` : `${start.d} al ${end.d}`;
  return {
    year,
    month,
    isoYear: w.year,
    week: w.week,
    key: segmentKey(year, month, w.week),
    start,
    end,
    days,
    partial,
    label:
      `${range} de ${MONTHS[month - 1]}` +
      (partial ? ` (${days} día${days === 1 ? "" : "s"})` : ""),
    short:
      start.d === end.d
        ? `${start.d} ${MES_CORTO[month - 1]}`
        : `${start.d}–${end.d} ${MES_CORTO[month - 1]}`,
  };
}

/** Tramos de un mes calendario, en orden. */
export function monthSegments(year: number, month: number): Segment[] {
  const last = daysInMonth(year, month);
  const out: Segment[] = [];
  let start: CivilDate = { y: year, m: month, d: 1 };
  while (start.d <= last && start.m === month) {
    const toSunday = 7 - isoWeekday(start);
    const endDay = Math.min(last, start.d + toSunday);
    const end: CivilDate = { y: year, m: month, d: endDay };
    out.push(buildSegment(year, month, start, end));
    if (endDay === last) break;
    start = { y: year, m: month, d: endDay + 1 };
  }
  return out;
}

/** Tramo al que pertenece una fecha. */
export function segmentOfDate(c: CivilDate): Segment {
  const seg = monthSegments(c.y, c.m).find((s) => s.start.d <= c.d && c.d <= s.end.d);
  // Siempre existe: los tramos cubren todo el mes.
  return seg as Segment;
}

/** Tramo de un mes que pertenece a la semana ISO `week` (o undefined). */
export function segmentOfWeek(year: number, month: number, week: number): Segment | undefined {
  return monthSegments(year, month).find((s) => s.week === week);
}

/**
 * Tramos de una semana ISO completa (uno si no cruza de mes, dos si cruza).
 */
export function weekSegments(isoYear: number, week: number): Segment[] {
  const monday = isoWeekMonday(isoYear, week);
  const sunday = addDays(monday, 6);
  const a = segmentOfDate(monday);
  if (sunday.m === monday.m) return [a];
  return [a, segmentOfDate(sunday)];
}

/** «28 sep al 4 oct» o «7 al 13 sep» para una semana ISO completa. */
export function formatWeekLabel(isoYear: number, week: number): string {
  const monday = isoWeekMonday(isoYear, week);
  const sunday = addDays(monday, 6);
  if (monday.m === sunday.m) return `${monday.d} al ${sunday.d} ${MES_CORTO[monday.m - 1]}`;
  return `${formatDayShort(monday)} al ${formatDayShort(sunday)}`;
}

export type MonthStatus = "abierto" | "cerrado" | "futuro";

/** Estado de un mes calendario frente a hoy. */
export function monthStatus(year: number, month: number, today: CivilDate): MonthStatus {
  const first: CivilDate = { y: year, m: month, d: 1 };
  const last: CivilDate = { y: year, m: month, d: daysInMonth(year, month) };
  if (compareDates(last, today) < 0) return "cerrado";
  if (compareDates(first, today) > 0) return "futuro";
  return "abierto";
}

export interface PeriodInfo {
  year: number;
  month: number;
  status: MonthStatus;
  daysInMonth: number;
  /** Semana ISO del tramo de referencia (el de hoy, o el último del mes). */
  week: number;
  isoYear: number;
}

/** Periodo actual: el mes calendario de hoy en la planta. */
export function currentPeriodInfo(now: Date = new Date()): PeriodInfo {
  const today = todayInPlant(now);
  const seg = segmentOfDate(today);
  return {
    year: today.y,
    month: today.m,
    status: "abierto",
    daysInMonth: daysInMonth(today.y, today.m),
    week: seg.week,
    isoYear: seg.isoYear,
  };
}

/** Periodo para un mes elegido. */
export function periodForMonth(year: number, month: number, now: Date = new Date()): PeriodInfo {
  const today = todayInPlant(now);
  if (today.y === year && today.m === month) return currentPeriodInfo(now);
  const segs = monthSegments(year, month);
  const status = monthStatus(year, month, today);
  const ref = status === "futuro" ? segs[0] : segs[segs.length - 1];
  return {
    year,
    month,
    status,
    daysInMonth: daysInMonth(year, month),
    week: ref.week,
    isoYear: ref.isoYear,
  };
}

/** Datos mínimos de un registro para calcular la fecha de corte. */
export interface CoverageRecord {
  year: number;
  month: number;
  week: number;
  /** Último día con datos del tramo (`yyyy-mm-dd`), si se conoce. */
  lastDate?: string;
}

/**
 * Fecha de corte del mes: el último día con datos cargados (RF-04). Es el
 * mayor `lastDate` de los registros del mes o, si no lo traen, el final de su
 * tramo. Nunca pasa de hoy. Devuelve el día del mes (0 = sin datos).
 */
export function cutoffDay(
  records: CoverageRecord[],
  year: number,
  month: number,
  today: CivilDate
): number {
  const segs = monthSegments(year, month);
  let best = 0;
  for (const r of records) {
    if (r.year !== year || r.month !== month) continue;
    const last = r.lastDate ? parseIsoDate(r.lastDate) : null;
    let day =
      last && last.y === year && last.m === month
        ? last.d
        : segs.find((s) => s.week === r.week)?.end.d ?? 0;
    if (day > best) best = day;
  }
  if (best === 0) return 0;
  if (today.y === year && today.m === month) best = Math.min(best, today.d);
  return best;
}

/** Iniciales de lunes a domingo. */
export const DOW = ["L", "M", "M", "J", "V", "S", "D"];
