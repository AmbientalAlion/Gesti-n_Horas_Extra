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

describe("computeEmployeeStatuses (regla del semáforo)", () => {
  const emp = [{ id: "a", code: "A" }, { id: "b", code: "B" }];
  // Octubre 2026: semanas 40–44 (5 semanas).
  const period = { year: 2026, month: 10, week: 41, status: "abierto" as const, weeksInMonth: 5 };
  const rec = (
    employeeId: string,
    week: number,
    overtimeHours: number,
    extra: Partial<import("./types").WeeklyRecord> = {}
  ): import("./types").WeeklyRecord => ({
    employeeId,
    year: 2026,
    week,
    month: 10,
    totalHours: 42 + overtimeHours,
    overtimeHours,
    isPartial: false,
    hasError: false,
    ...extra,
  });

  it("proyecta con el ritmo de las semanas cubiertas del conjunto", () => {
    // Semanas 40 y 41 cubiertas; «a» solo tiene registro en la 40.
    const [a] = computeEmployeeStatuses(emp, [rec("a", 40, 10), rec("b", 41, 5)], period);
    // 10h en 2 semanas cubiertas → 5h/sem × 3 restantes = 25h.
    expect(a.projectedMonthlyOvertime).toBe(25);
    expect(a.level).toBe("green");
  });

  it("la proyección nunca queda por debajo de lo acumulado", () => {
    const recs = [40, 41, 42, 43].map((w) => rec("a", w, 11));
    const [a] = computeEmployeeStatuses(emp, recs, period);
    expect(a.monthlyOvertime).toBe(44);
    expect(a.projectedMonthlyOvertime).toBeGreaterThanOrEqual(44);
  });

  it("mes cerrado: la proyección es el acumulado", () => {
    const recs = [40, 41].map((w) => rec("a", w, 20));
    const [a] = computeEmployeeStatuses(emp, recs, { ...period, status: "cerrado" });
    expect(a.projectedMonthlyOvertime).toBe(40);
    expect(a.level).toBe("yellow");
  });

  it("más de 12h en una semana no pone rojo; cuenta semanas altas del mes", () => {
    const recs = [rec("a", 40, 14), rec("a", 41, 13), rec("a", 42, 2)];
    const [a] = computeEmployeeStatuses(emp, recs, { ...period, status: "cerrado" });
    expect(a.level).toBe("green");
    expect(a.highWeeksMonth).toBe(2);
    const s = summarize(computeEmployeeStatuses(emp, recs, period));
    expect(s.weeklyHigh).toBe(2);
    expect(s.weeklyHighPeople).toBe(1);
  });

  it("congelado sin revisar: por revisar, no suma y estima el potencial", () => {
    const recs = [
      rec("a", 40, 10),
      rec("a", 41, 0, { hasError: true, totalHours: 90 }),
    ];
    const [a] = computeEmployeeStatuses(emp, recs, period);
    expect(a.monthlyOvertime).toBe(10);
    expect(a.hasError).toBe(true);
    expect(a.pendingReviewCount).toBe(1);
    expect(a.potentialMonthlyOvertime).toBe(58);
    expect(a.reasons.some((r) => r.includes("por revisar"))).toBe(true);
    expect(a.reasons).not.toContain("Operación normal.");
  });

  it("un registro descartado ya no deja a la persona por revisar", () => {
    const recs = [
      rec("a", 40, 10),
      rec("a", 41, 0, { hasError: true, totalHours: 90, reviewStatus: "descartado" }),
    ];
    const [a] = computeEmployeeStatuses(emp, recs, period);
    expect(a.hasError).toBe(false);
    expect(a.pendingReviewCount).toBe(0);
    expect(a.monthlyOvertime).toBe(10);
  });

  it("registros de novedades: no se inventan totales en la ficha", () => {
    const recs = [rec("a", 40, 6, { source: "novedades", totalHours: 0 })];
    const statuses = computeEmployeeStatuses(emp, recs, period);
    const d = buildEmployeeDetail(statuses[0], recs, statuses, period);
    expect(d.totalHoursMonth).toBeNull();
    expect(d.baseHoursMonth).toBeNull();
    expect(d.history[0].totalHours).toBeNull();
    expect(d.history[0].monthToDate).toBe(6);
    expect(d.extraHoursMonth).toBe(6);
  });
});
