// Reparto de horas en tramos (parte de una semana dentro de un mes).
//
//  - Archivo de novedades: cada evento trae su fecha, así que cada hora va al
//    tramo de su día. Es exacto (ver parseOvertimeEventsCsv).
//  - Archivo semanal del biométrico: no trae días. Si la semana cruza de mes,
//    las horas se reparten en proporción a los días de cada mes y el tramo se
//    marca «estimado» (D-3). Con un corte parcial solo cuentan los días hasta
//    la fecha de corte.

import { addDays, compareDates, isoDate, isoWeekMonday, parseIsoDate, weekSegments } from "./dates";
import { round2 } from "./overtime";

export interface SegmentShare {
  year: number;
  month: number;
  week: number;
  /** Fracción de la semana que va a este tramo (0–1). */
  share: number;
  /** Último día con datos del tramo (`yyyy-mm-dd`). */
  lastDate: string;
  /** true si el reparto es una estimación (varios meses sin detalle diario). */
  estimated: boolean;
}

/**
 * Tramos de una semana ISO y la parte que le toca a cada uno.
 * `until` (opcional, `yyyy-mm-dd`) = último día con datos de un corte parcial.
 */
export function splitWeek(isoYear: number, week: number, until?: string): SegmentShare[] {
  const monday = isoWeekMonday(isoYear, week);
  const sunday = addDays(monday, 6);
  let last = sunday;
  const u = until ? parseIsoDate(until) : null;
  if (u && compareDates(u, monday) >= 0 && compareDates(u, sunday) < 0) last = u;

  const segs = weekSegments(isoYear, week)
    .map((s) => {
      // Días del tramo que están dentro del periodo con datos.
      const from = s.start;
      const to = compareDates(s.end, last) <= 0 ? s.end : last;
      const days = compareDates(to, from) >= 0 ? to.d - from.d + 1 : 0;
      return { s, days, to };
    })
    .filter((x) => x.days > 0);

  const total = segs.reduce((a, x) => a + x.days, 0);
  const estimated = segs.length > 1;
  return segs.map((x) => ({
    year: x.s.year,
    month: x.s.month,
    week: x.s.week,
    share: x.days / total,
    lastDate: isoDate(x.to),
    estimated,
  }));
}

/** Reparte una cantidad según las partes de `splitWeek`, sin perder centésimas. */
export function distribute(value: number, shares: SegmentShare[]): number[] {
  const out = shares.map((s) => round2(value * s.share));
  const diff = round2(value - out.reduce((a, v) => a + v, 0));
  if (out.length > 0 && diff !== 0) out[out.length - 1] = round2(out[out.length - 1] + diff);
  return out;
}
