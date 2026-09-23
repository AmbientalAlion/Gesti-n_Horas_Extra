import { describe, it, expect } from "vitest";
import { applyFilters, buildFilterOptions, type EmployeeInput } from "./aggregate";

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
