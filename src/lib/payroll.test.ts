import { describe, it, expect } from "vitest";
import { computeEmployeeStatuses } from "./aggregate";
import { buildPayrollCsv, buildPayrollRows, neutralizeFormula, payrollTotals } from "./payroll";
import type { WeeklyRecord } from "./types";

const period = { year: 2026, month: 10, week: 44, status: "cerrado" as const, weeksInMonth: 5 };
const rec = (employeeId: string, week: number, ot: number, extra: Partial<WeeklyRecord> = {}): WeeklyRecord => ({
  employeeId, year: 2026, week, month: 10, totalHours: 42 + ot, overtimeHours: ot,
  isPartial: false, hasError: false, ...extra,
});

describe("buildPayrollRows", () => {
  const emps = [
    { id: "a", code: "10", name: "Ana", area: "Producción" },
    { id: "b", code: "2", name: "=HYPERLINK(\"x\")", area: "+SUM(A1)" },
    { id: "c", code: "3", name: "Sin extras" },
  ];

  it("excluye semanas congeladas, no personas", () => {
    const recs = [
      rec("a", 40, 10),
      rec("a", 41, 0, { hasError: true, totalHours: 90 }),
      rec("a", 42, 0, { hasError: true, totalHours: 80, reviewStatus: "descartado" }),
      rec("a", 43, 20),
      rec("b", 40, 5.5),
    ];
    const statuses = computeEmployeeStatuses(emps, recs, period);
    const rows = buildPayrollRows(statuses, recs, period);
    expect(rows.map((r) => r.code)).toEqual(["2", "10"]);
    const a = rows.find((r) => r.code === "10")!;
    expect(a.overtimeHours).toBe(30);
    expect(a.pendingWeeks).toBe(1);
    expect(a.discardedWeeks).toBe(1);
    expect(payrollTotals(rows)).toMatchObject({ people: 2, hours: 35.5, pendingPeople: 1 });
  });

  it("CSV para Excel es-CO: BOM, «;», coma decimal, estados en español y sin fórmulas", () => {
    const recs = [rec("b", 40, 5.5)];
    const statuses = computeEmployeeStatuses(emps, recs, period);
    const csv = buildPayrollCsv(buildPayrollRows(statuses, recs, period));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [header, line] = csv.slice(1).split("\r\n");
    expect(header.split(";")[0]).toBe("ID_Empleado");
    expect(header).not.toContain("Semana;");
    const cells = line.split(";");
    expect(cells[1]).toBe(`"'=HYPERLINK(""x"")"`);
    expect(cells[2]).toBe("'+SUM(A1)");
    expect(cells[6]).toBe("5,50");
    expect(cells[13]).toBe("Normal");
  });

  it("neutralizeFormula", () => {
    expect(neutralizeFormula("-3")).toBe("'-3");
    expect(neutralizeFormula("@x")).toBe("'@x");
    expect(neutralizeFormula("Ana")).toBe("Ana");
  });
});
