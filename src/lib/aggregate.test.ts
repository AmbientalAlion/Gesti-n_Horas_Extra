import { describe, it, expect } from "vitest";
import {
  applyFilters,
  buildEmployeeDetail,
  buildFilterOptions,
  computeEmployeeStatuses,
  summarize,
  type EmployeeInput,
} from "./aggregate";

const EMPS: EmployeeInput[] = [
  { id: "1", code: "1", plant: "RIO CLARO", direccion: "DIRECCION INDUSTRIAL", area: "GESTION MANTENIMIENTO", costCenter: "EC7EC00010-GESTION MANTENIMIENTO", managerName: "Diego" },
  { id: "2", code: "2", plant: "RIO CLARO", direccion: "DIRECCION INDUSTRIAL", area: "GESTION DE PRODUCCION", costCenter: "EC7EC00020-GESTION DE PRODUCCION", managerName: "Carlos" },
  { id: "3", code: "3", plant: "RIONEGRO", direccion: "CONCRETOS", area: "TRANSPORTE RIONEGRO", costCenter: "CA7CA00140-TRANSPORTE RIONEGRO", managerName: "Rafael" },
  { id: "4", code: "4", plant: "RIONEGRO", direccion: "CONCRETOS", area: "CALIDAD RIONEGRO", costCenter: "CA7CA00122-CALIDAD RIONEGRO", managerName: "Carmen" },
];

describe("buildFilterOptions (cascada)", () => {
  it("sin filtros muestra todas las opciones distintas", () => {
    const o = buildFilterOptions(EMPS);
    expect(o.plants).toEqual(["RIO CLARO", "RIONEGRO"]);
    expect(o.directions).toEqual(["CONCRETOS", "DIRECCION INDUSTRIAL"]);
    expect(o.areas.length).toBe(4);
    expect(o.managers.length).toBe(4);
  });

  it("al elegir planta limita direcciones, áreas, CeCo y jefes a esa sede", () => {
    const o = buildFilterOptions(EMPS, { plant: "RIO CLARO" });
    expect(o.directions).toEqual(["DIRECCION INDUSTRIAL"]);
    expect(o.areas.sort()).toEqual(["GESTION DE PRODUCCION", "GESTION MANTENIMIENTO"]);
    expect(o.managers.sort()).toEqual(["Carlos", "Diego"]);
    // La propia dimensión (plants) no se auto-restringe: sigue mostrando ambas.
    expect(o.plants).toEqual(["RIO CLARO", "RIONEGRO"]);
  });

  it("al elegir dirección limita áreas y centros de costo", () => {
    const o = buildFilterOptions(EMPS, { direccion: "CONCRETOS" });
    expect(o.areas.sort()).toEqual(["CALIDAD RIONEGRO", "TRANSPORTE RIONEGRO"]);
    expect(o.costCenters.length).toBe(2);
    expect(o.plants).toEqual(["RIONEGRO"]);
  });
});

describe("applyFilters", () => {
  it("combina varias dimensiones", () => {
    const r = applyFilters(EMPS, { plant: "RIONEGRO", direccion: "CONCRETOS", area: "CALIDAD RIONEGRO" });
    expect(r.map((e) => e.id)).toEqual(["4"]);
  });

  it("filtra por centro de costo exacto", () => {
    const r = applyFilters(EMPS, { costCenter: "EC7EC00010-GESTION MANTENIMIENTO" });
    expect(r.map((e) => e.id)).toEqual(["1"]);
  });
});

describe("computeEmployeeStatuses (v2)", () => {
  const emp = [{ id: "a", code: "A" }, { id: "b", code: "B" }];
  type R = import("./types").WeeklyRecord;
  const rec = (employeeId: string, year: number, month: number, week: number, ot: number, extra: Partial<R> = {}): R => ({
    employeeId, year, month, week, totalHours: 42 + ot, overtimeHours: ot,
    isPartial: false, hasError: false, ...extra,
  });
  const feb = { year: 2027, month: 2, week: 5, status: "abierto" as const };

  it("CP-04 a CP-07: el caso de 17h en la primera semana de febrero 2027", () => {
    const r1 = [rec("a", 2027, 2, 5, 17)];
    const [s1] = computeEmployeeStatuses(emp, r1, { ...feb, cutoffDay: 7 });
    expect(s1).toMatchObject({ level: "yellow", risk: "meta", overTarget: 5, highWeeksMonth: 1 });
    expect(s1.reasons[0]).toContain("5,0h por encima de la meta al 7 de febrero");

    const r2 = [...r1, rec("a", 2027, 2, 6, 0)];
    const [s2] = computeEmployeeStatuses(emp, r2, { ...feb, cutoffDay: 14 });
    expect(s2).toMatchObject({ level: "green", projectedMonthlyOvertime: 34 });
    // La alerta semanal de la primera semana sigue en el mes.
    expect(s2.highWeeks.map((w) => w.label)).toEqual(["1 al 7 feb"]);

    const r3 = [...r2, rec("a", 2027, 2, 7, 20)];
    const [s3] = computeEmployeeStatuses(emp, r3, { ...feb, cutoffDay: 21 });
    expect(s3).toMatchObject({ level: "yellow", overTarget: 1, highWeeksMonth: 2 });

    const r4 = [...r3, rec("a", 2027, 2, 8, 10)];
    const [s4] = computeEmployeeStatuses(emp, r4, { ...feb, cutoffDay: 28, status: "cerrado" });
    expect(s4).toMatchObject({ level: "green", monthlyOvertime: 47, projectedMonthlyOvertime: 47 });
  });

  it("CP-11: la semana del 28 sep al 4 oct se mide completa y se cuenta en octubre", () => {
    const recs = [rec("a", 2026, 9, 40, 6), rec("a", 2026, 10, 40, 8)];
    const [sep] = computeEmployeeStatuses(emp, recs, { year: 2026, month: 9, week: 40, cutoffDay: 30, status: "cerrado" });
    expect(sep.monthlyOvertime).toBe(6);
    expect(sep.highWeeks).toMatchObject([{ label: "28 sep al 4 oct", hours: 14, shared: true, counted: false }]);
    expect(sep.highWeeksMonth).toBe(0);
    const [oct] = computeEmployeeStatuses(emp, recs, { year: 2026, month: 10, week: 40, cutoffDay: 4 });
    expect(oct.monthlyOvertime).toBe(8);
    expect(oct.highWeeksMonth).toBe(1);
  });

  it("CP-16: congelado sin revisar no suma y muestra el rango", () => {
    const recs = [
      rec("a", 2026, 9, 37, 10),
      rec("a", 2026, 9, 38, 0, { hasError: true, totalHours: 90 }),
    ];
    const [a] = computeEmployeeStatuses(emp, recs, { year: 2026, month: 9, week: 38, cutoffDay: 20 });
    expect(a).toMatchObject({ monthlyOvertime: 10, hasError: true, pendingReviewCount: 1, potentialMonthlyOvertime: 58 });
    expect(a.reasons.some((r) => r.includes("entre 10,0h y 58,0h"))).toBe(true);
  });

  it("CP-17: un registro descartado ya no deja a la persona por revisar", () => {
    const recs = [
      rec("a", 2026, 9, 37, 10),
      rec("a", 2026, 9, 38, 0, { hasError: true, totalHours: 90, reviewStatus: "descartado" }),
    ];
    const [a] = computeEmployeeStatuses(emp, recs, { year: 2026, month: 9, week: 38, cutoffDay: 20 });
    expect(a).toMatchObject({ hasError: false, pendingReviewCount: 0, monthlyOvertime: 10 });
  });

  it("resumen: riesgo por meta y por proyección, semanas de más de 12h", () => {
    const recs = [
      rec("a", 2026, 9, 37, 13), rec("a", 2026, 9, 38, 13),
      rec("b", 2026, 9, 37, 11), rec("b", 2026, 9, 38, 11), rec("b", 2026, 9, 36, 10),
    ];
    const statuses = computeEmployeeStatuses(emp, recs, { year: 2026, month: 9, week: 38, cutoffDay: 20 });
    const s = summarize(statuses);
    // a: 26h ≤ 34,3h; proyección 39h → Normal. b: 32h ≤ 34,3h; proyección 48h → Normal.
    expect(s).toMatchObject({ green: 2, weeklyHigh: 2, weeklyHighPeople: 1 });
  });

  it("detalle: tramos con acumulado y meta; novedades sin totales inventados", () => {
    const recs = [rec("a", 2026, 9, 36, 6, { source: "novedades", totalHours: 0 })];
    const statuses = computeEmployeeStatuses(emp, recs, { year: 2026, month: 9, week: 36, cutoffDay: 6 });
    const d = buildEmployeeDetail(statuses[0], recs, statuses, { year: 2026, month: 9, week: 36, cutoffDay: 6 });
    expect(d.totalHoursMonth).toBeNull();
    expect(d.history[0]).toMatchObject({ totalHours: null, monthToDate: 6, label: "1 al 6 de septiembre (6 días)" });
    expect(d.segments.map((x) => x.short)).toEqual(["1–6 sep", "7–13 sep", "14–20 sep", "21–27 sep", "28–30 sep"]);
    expect(d.segments[0]).toMatchObject({ hours: 6, cumulative: 6, future: false, weekShared: true });
    expect(d.segments[1].future).toBe(true);
    expect(d.segments.map((x) => Math.round(x.target * 10) / 10)).toEqual([10.3, 22.3, 34.3, 46.3, 48]);
  });
});
