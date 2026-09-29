import { describe, it, expect } from "vitest";
import {
  coveredWeeks,
  currentPeriodInfo,
  formatWeekRange,
  isoDate,
  monthStatus,
  parseIsoDate,
  periodForMonth,
  todayInPlant,
  weekDays,
  weekInfo,
  weeksOfMonth,
} from "./dates";

describe("todayInPlant (hora de Colombia, no del servidor)", () => {
  it("a las 19:30 de Colombia sigue siendo el mismo día aunque en UTC ya sea mañana", () => {
    // 30-sep-2026 19:30 COT = 1-oct-2026 00:30 UTC
    expect(todayInPlant(new Date("2026-10-01T00:30:00Z"))).toEqual({ y: 2026, m: 9, d: 30 });
  });
  it("el domingo por la noche no salta a la semana siguiente", () => {
    // domingo 4-oct-2026 20:00 COT = lunes 5-oct 01:00 UTC
    const p = currentPeriodInfo(new Date("2026-10-05T01:00:00Z"));
    expect(p.week).toBe(40);
  });
});

describe("weekInfo (semana ISO y mes del jueves)", () => {
  it("la semana 40 de 2026 (28 sep – 4 oct) se imputa a octubre", () => {
    expect(weekInfo({ y: 2026, m: 9, d: 29 })).toEqual({ year: 2026, week: 40, month: 10 });
  });
  it("el 1-ene-2027 pertenece a la semana 53 de 2026, imputada a diciembre", () => {
    expect(weekInfo({ y: 2027, m: 1, d: 1 })).toEqual({ year: 2026, week: 53, month: 12 });
  });
  it("el 29-dic-2025 ya es la semana 1 de 2026, imputada a enero", () => {
    expect(weekInfo({ y: 2025, m: 12, d: 29 })).toEqual({ year: 2026, week: 1, month: 1 });
  });
});

describe("weeksOfMonth", () => {
  it("septiembre de 2026 tiene 4 semanas (36–39)", () => {
    expect(weeksOfMonth(2026, 9).map((w) => w.week)).toEqual([36, 37, 38, 39]);
  });
  it("octubre de 2026 tiene 5 semanas (40–44)", () => {
    const w = weeksOfMonth(2026, 10);
    expect(w.map((x) => x.week)).toEqual([40, 41, 42, 43, 44]);
    expect(isoDate(w[0].start)).toBe("2026-09-28");
    expect(isoDate(w[4].end)).toBe("2026-11-01");
  });
  it("diciembre de 2026 termina en la semana 53", () => {
    expect(weeksOfMonth(2026, 12).map((w) => w.week)).toEqual([49, 50, 51, 52, 53]);
  });
});

describe("periodos", () => {
  const hoy = new Date("2026-09-29T15:00:00Z"); // martes 29-sep-2026
  it("el periodo actual es la semana 40 de octubre, abierto y de 5 semanas", () => {
    const p = currentPeriodInfo(hoy);
    expect(p).toMatchObject({ year: 2026, month: 10, week: 40, status: "abierto", weeksInMonth: 5 });
  });
  it("septiembre ya está cerrado el 29-sep (su última semana terminó el 27)", () => {
    expect(monthStatus(2026, 9, todayInPlant(hoy))).toBe("cerrado");
    const p = periodForMonth(2026, 9, hoy);
    expect(p).toMatchObject({ status: "cerrado", week: 39 });
  });
  it("un mes futuro usa su primera semana", () => {
    expect(periodForMonth(2026, 12, hoy)).toMatchObject({ status: "futuro", week: 49 });
  });
});

describe("coveredWeeks", () => {
  it("cuenta las semanas del mes hasta la última con datos, aunque falten personas", () => {
    const recs = [
      { year: 2026, month: 10, week: 40 },
      { year: 2026, month: 10, week: 42 },
      { year: 2026, month: 9, week: 39 },
    ];
    expect(coveredWeeks(recs, 2026, 10)).toBe(3);
    expect(coveredWeeks([], 2026, 10)).toBe(0);
  });
});

describe("utilidades", () => {
  it("weekDays devuelve lunes a domingo", () => {
    expect(weekDays({ y: 2026, m: 9, d: 30 }).map(isoDate)).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
  });
  it("parseIsoDate rechaza fechas imposibles", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-10-01")).toEqual({ y: 2026, m: 10, d: 1 });
  });
  it("formatWeekRange cruza meses", () => {
    const [w] = weeksOfMonth(2026, 10);
    expect(formatWeekRange(w.start, w.end)).toBe("28 sep – 4 oct");
  });
});
