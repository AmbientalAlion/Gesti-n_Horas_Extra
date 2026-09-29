import { describe, expect, it } from "vitest";
import { distribute, splitWeek } from "./ingest";
import { parseOvertimeEventsCsv } from "./csv";

describe("splitWeek (archivo semanal sin fechas, D-3)", () => {
  it("CP-12: 14h en la semana del 28 sep al 4 oct → 6h a septiembre y 8h a octubre, estimado", () => {
    const shares = splitWeek(2026, 40);
    expect(shares.map((s) => [s.year, s.month, s.week, s.lastDate, s.estimated])).toEqual([
      [2026, 9, 40, "2026-09-30", true],
      [2026, 10, 40, "2026-10-04", true],
    ]);
    expect(distribute(14, shares)).toEqual([6, 8]);
  });

  it("una semana dentro del mes no es estimada", () => {
    const shares = splitWeek(2026, 38);
    expect(shares).toEqual([
      { year: 2026, month: 9, week: 38, share: 1, lastDate: "2026-09-20", estimated: false },
    ]);
  });

  it("corte parcial: solo cuentan los días hasta la fecha de corte", () => {
    // Datos hasta el miércoles 30 de septiembre: todo es de septiembre.
    const shares = splitWeek(2026, 40, "2026-09-30");
    expect(shares.map((s) => [s.month, s.share, s.estimated])).toEqual([[9, 1, false]]);
  });

  it("distribute no pierde centésimas", () => {
    expect(distribute(10, splitWeek(2026, 40))).toEqual([4.29, 5.71]);
  });
});

describe("parseOvertimeEventsCsv (novedades por fecha)", () => {
  const line = (code: string, fecha: string, horas: string, concepto = "Extra diurna") => {
    const cols = Array.from({ length: 28 }, () => "");
    cols[0] = "ANA RESTREPO";
    cols[1] = code;
    cols[2] = "CA7CA00120-PRODUCCION";
    cols[3] = "CONCRETOS";
    cols[9] = concepto;
    cols[12] = horas;
    cols[19] = fecha;
    return cols.join(";");
  };
  const header = "Nombre;Identificacion;CeCo;Direccion;;;;;;Concepto;;;Tiempo_H;;;;;;;IdFecha;;Jefe;;;Division;;;";

  it("CP-11: cada evento va al mes de su fecha y se guarda el último día", () => {
    const csv = [header, line("1001", "20260929", "6"), line("1001", "20261002", "5"), line("1001", "20261003", "3,0")].join("\n");
    const { rows, errors } = parseOvertimeEventsCsv(csv);
    expect(errors).toEqual([]);
    const sorted = rows.sort((a, b) => a.month - b.month);
    expect(sorted.map((r) => [r.year, r.month, r.week, r.overtimeHours, r.lastDate])).toEqual([
      [2026, 9, 40, 6, "2026-09-29"],
      [2026, 10, 40, 8, "2026-10-03"],
    ]);
  });

  it("rechaza fechas imposibles", () => {
    const { rows, errors } = parseOvertimeEventsCsv([header, line("1001", "20260231", "2")].join("\n"));
    expect(rows).toEqual([]);
    expect(errors[0]).toContain("fecha inválida");
  });
});
