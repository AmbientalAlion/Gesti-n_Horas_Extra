import { describe, expect, it } from "vitest";
import {
  currentPeriodInfo,
  cutoffDay,
  daysInMonth,
  formatWeekLabel,
  isoWeekMonday,
  monthSegments,
  monthStatus,
  parseIsoDate,
  periodForMonth,
  segmentOfDate,
  todayInPlant,
  weekInfo,
  weekSegments,
} from "./dates";

describe("todayInPlant (hora de Colombia)", () => {
  it("a las 19:30 de Colombia sigue siendo el mismo día aunque en UTC ya sea el siguiente", () => {
    // 2026-09-29 19:30 COT = 2026-09-30 00:30 UTC
    expect(todayInPlant(new Date("2026-09-30T00:30:00Z"))).toEqual({ y: 2026, m: 9, d: 29 });
  });
});

describe("monthSegments (tramos del mes calendario)", () => {
  it("CP-01: septiembre 2026 se nombra por fechas y marca los parciales", () => {
    const segs = monthSegments(2026, 9);
    expect(segs.map((s) => s.label)).toEqual([
      "1 al 6 de septiembre (6 días)",
      "7 al 13 de septiembre",
      "14 al 20 de septiembre",
      "21 al 27 de septiembre",
      "28 al 30 de septiembre (3 días)",
    ]);
    expect(segs.map((s) => s.short)).toEqual(["1–6 sep", "7–13 sep", "14–20 sep", "21–27 sep", "28–30 sep"]);
    expect(segs.map((s) => s.week)).toEqual([36, 37, 38, 39, 40]);
  });

  it("febrero 2027 empieza lunes: 4 semanas completas", () => {
    const segs = monthSegments(2027, 2);
    expect(segs.map((s) => [s.start.d, s.end.d, s.partial])).toEqual([
      [1, 7, false],
      [8, 14, false],
      [15, 21, false],
      [22, 28, false],
    ]);
  });

  it("un mes de 31 días que empieza domingo tiene 6 tramos (mayo 2022)", () => {
    const segs = monthSegments(2022, 5);
    expect(segs).toHaveLength(6);
    expect(segs[0].label).toBe("1 de mayo (1 día)");
    expect(segs[5].label).toBe("30 al 31 de mayo (2 días)");
  });

  it("diciembre 2026 termina con un tramo de la semana 53", () => {
    const segs = monthSegments(2026, 12);
    const last = segs[segs.length - 1];
    expect([last.start.d, last.end.d, last.week, last.isoYear]).toEqual([28, 31, 53, 2026]);
    const jan = monthSegments(2027, 1)[0];
    expect([jan.start.d, jan.end.d, jan.week, jan.isoYear]).toEqual([1, 3, 53, 2026]);
  });

  it("segmentOfDate ubica cada día en su tramo", () => {
    expect(segmentOfDate({ y: 2026, m: 9, d: 29 }).label).toBe("28 al 30 de septiembre (3 días)");
    expect(segmentOfDate({ y: 2026, m: 10, d: 2 }).label).toBe("1 al 4 de octubre (4 días)");
  });
});

describe("semanas que cruzan de mes", () => {
  it("la semana del 28 sep al 4 oct tiene dos tramos y cuenta en octubre", () => {
    const segs = weekSegments(2026, 40);
    expect(segs.map((s) => [s.month, s.days])).toEqual([
      [9, 3],
      [10, 4],
    ]);
    expect(weekInfo({ y: 2026, m: 9, d: 28 }).month).toBe(10);
    expect(formatWeekLabel(2026, 40)).toBe("28 sep al 4 oct");
    expect(formatWeekLabel(2027, 5)).toBe("1 al 7 feb");
  });

  it("isoWeekMonday", () => {
    expect(isoWeekMonday(2026, 40)).toEqual({ y: 2026, m: 9, d: 28 });
    expect(isoWeekMonday(2026, 1)).toEqual({ y: 2025, m: 12, d: 29 });
  });
});

describe("estado del mes y periodo", () => {
  const today = { y: 2026, m: 9, d: 29 };
  it("mes calendario: septiembre abierto el 29, agosto cerrado, octubre futuro", () => {
    expect(monthStatus(2026, 9, today)).toBe("abierto");
    expect(monthStatus(2026, 8, today)).toBe("cerrado");
    expect(monthStatus(2026, 10, today)).toBe("futuro");
  });

  it("el periodo actual el 29 de septiembre es septiembre (ya no octubre)", () => {
    const p = currentPeriodInfo(new Date("2026-09-29T15:00:00Z"));
    expect(p).toMatchObject({ year: 2026, month: 9, week: 40, status: "abierto", daysInMonth: 30 });
  });

  it("un mes cerrado toma su último tramo como referencia", () => {
    const p = periodForMonth(2026, 8, new Date("2026-09-29T15:00:00Z"));
    expect(p).toMatchObject({ status: "cerrado", daysInMonth: 31, week: 36 });
  });

  it("daysInMonth", () => {
    expect([daysInMonth(2027, 2), daysInMonth(2028, 2), daysInMonth(2026, 9)]).toEqual([28, 29, 30]);
  });
});

describe("cutoffDay (fecha de corte, RF-04)", () => {
  const today = { y: 2026, m: 9, d: 29 };
  it("usa el último día con datos, no la fecha de hoy", () => {
    const recs = [{ year: 2026, month: 9, week: 38, lastDate: "2026-09-18" }];
    expect(cutoffDay(recs, 2026, 9, today)).toBe(18);
  });
  it("sin lastDate toma el final del tramo, sin pasar de hoy", () => {
    expect(cutoffDay([{ year: 2026, month: 9, week: 38 }], 2026, 9, today)).toBe(20);
    expect(cutoffDay([{ year: 2026, month: 9, week: 40 }], 2026, 9, today)).toBe(29);
  });
  it("sin datos del mes es 0", () => {
    expect(cutoffDay([{ year: 2026, month: 8, week: 35 }], 2026, 9, today)).toBe(0);
  });
});

describe("parseIsoDate", () => {
  it("rechaza fechas imposibles", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-09-01")).toEqual({ y: 2026, m: 9, d: 1 });
  });
});
