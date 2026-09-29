import { describe, expect, it } from "vitest";
import { isoWeek, parseBiometricCsv } from "./csv";

describe("parseBiometricCsv", () => {
  it("parsea encabezados con tildes y variaciones", () => {
    const csv = [
      "ID,Rol,Área,Horas Totales,Turno Máximo",
      "E1,Operario,Planta,50,10",
      "E2,Operario,Planta,60,18",
    ].join("\n");
    const { rows, errors } = parseBiometricCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      employeeId: "E1",
      role: "Operario",
      area: "Planta",
      totalHours: 50,
      maxShiftHours: 10,
    });
    expect(rows[1].maxShiftHours).toBe(18);
  });

  it("acepta coma decimal", () => {
    const csv = "id,horas_totales\nE1,45,5";
    // Nota: coma como decimal dentro de un CSV separado por comas no aplica;
    // se valida el parseo de punto y coma en celdas ya delimitadas.
    const csv2 = "id;horas_totales\nE1;45,5";
    const { rows } = parseBiometricCsv(csv2);
    expect(rows[0]?.totalHours).toBe(45.5);
  });

  it("reporta error cuando faltan columnas obligatorias", () => {
    const csv = "nombre,area\nJuan,Planta";
    const { rows, errors } = parseBiometricCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors.some((e) => /identificación/.test(e))).toBe(true);
    expect(errors.some((e) => /Horas Totales/.test(e))).toBe(true);
  });

  it("reporta filas con datos inválidos sin abortar", () => {
    const csv = ["id,horas_totales", "E1,50", "E2,abc", ",30"].join("\n");
    const { rows, errors } = parseBiometricCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("isoWeek", () => {
  it("calcula semana ISO correctamente", () => {
    // 1 de enero de 2026 es jueves => semana 1
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
    // 15 de junio de 2026 (lunes) => semana 25
    expect(isoWeek(new Date(2026, 5, 15)).week).toBe(25);
  });
});

