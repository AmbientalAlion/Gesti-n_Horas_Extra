import { describe, expect, it } from "vitest";
import {
  buildWeeklyRecord,
  calculateWeeklyOvertime,
  detectOrphanHours,
  evaluateStatus,
  projectMonth,
  projectWeek,
  RULES,
  sumOvertime,
} from "./overtime";

describe("calculateWeeklyOvertime", () => {
  it("no hay extras por debajo de la jornada base", () => {
    expect(calculateWeeklyOvertime(40)).toBe(0);
    expect(calculateWeeklyOvertime(42)).toBe(0);
  });

  it("calcula extras por encima de 42h", () => {
    expect(calculateWeeklyOvertime(50)).toBe(8);
    expect(calculateWeeklyOvertime(54.5)).toBe(12.5);
  });

  it("nunca es negativo ni NaN", () => {
    expect(calculateWeeklyOvertime(0)).toBe(0);
    expect(calculateWeeklyOvertime(-5)).toBe(0);
    expect(calculateWeeklyOvertime(NaN)).toBe(0);
  });
});

describe("detectOrphanHours", () => {
  it("marca turnos de más de 16h como huérfanos", () => {
    expect(detectOrphanHours({ employeeId: "1", totalHours: 60, maxShiftHours: 18 })).toMatch(
      /supera el máximo/
    );
  });

  it("no marca turnos normales", () => {
    expect(detectOrphanHours({ employeeId: "1", totalHours: 50, maxShiftHours: 10 })).toBeNull();
    expect(detectOrphanHours({ employeeId: "1", totalHours: 50, maxShiftHours: 16 })).toBeNull();
    expect(detectOrphanHours({ employeeId: "1", totalHours: 50 })).toBeNull();
  });
});

describe("buildWeeklyRecord", () => {
  const meta = { year: 2026, week: 25, month: 6, isPartial: false };

  it("registro normal calcula extras", () => {
    const r = buildWeeklyRecord({ employeeId: "E1", totalHours: 55 }, meta);
    expect(r.overtimeHours).toBe(13);
    expect(r.hasError).toBe(false);
  });

  it("registro con horas huérfanas se congela y no suma extras", () => {
    const r = buildWeeklyRecord(
      { employeeId: "E1", totalHours: 80, maxShiftHours: 20 },
      meta
    );
    expect(r.hasError).toBe(true);
    expect(r.overtimeHours).toBe(0);
    expect(r.errorReason).toBeDefined();
  });
});

describe("projectWeek (burn rate)", () => {
  it("proyecta el total al cierre según promedio diario", () => {
    // 30h en 3 días => 10h/día => 60h proyectadas (6 días laborales)
    const p = projectWeek(30, 3);
    expect(p.dailyAverage).toBe(10);
    expect(p.projectedTotalHours).toBe(60);
    expect(p.projectedOvertimeHours).toBe(18);
    expect(p.willExceedWeeklyLimit).toBe(true);
  });

  it("no marca exceso si la proyección está dentro del límite", () => {
    // 24h en 3 días => 8h/día => 48h => 6h extra proyectadas
    const p = projectWeek(24, 3);
    expect(p.projectedOvertimeHours).toBe(6);
    expect(p.willExceedWeeklyLimit).toBe(false);
  });
});

describe("projectMonth (proyección de cierre)", () => {
  it("proyecta el mes según el promedio semanal", () => {
    // 30h extra en 2 semanas => 15/sem => ~65h proyectadas (4.345 sem)
    const p = projectMonth(30, 2);
    expect(p.projectedMonthlyOvertime).toBeGreaterThan(RULES.MONTHLY_OVERTIME_LIMIT);
    expect(p.willExceedMonthly).toBe(true);
  });

  it("no marca exceso si el ritmo es bajo", () => {
    // 12h en 2 semanas => 6/sem => ~26h => dentro del límite
    const p = projectMonth(12, 2);
    expect(p.willExceedMonthly).toBe(false);
  });
});

describe("evaluateStatus (semáforo, límite duro MENSUAL)", () => {
  it("verde en operación normal", () => {
    expect(evaluateStatus(20, 26, 5).level).toBe("green");
  });

  it("superar 12h en la semana NO es crítico (permitido)", () => {
    // 20h semana (>12) pero mes bajo y proyección baja => verde
    const s = evaluateStatus(20, 26, 20);
    expect(s.level).toBe("green");
    expect(s.weeklyHigh).toBe(true);
    expect(s.monthlyExceeded).toBe(false);
  });

  it("amarillo cerca del límite mensual", () => {
    const s = evaluateStatus(RULES.MONTHLY_OVERTIME_WARNING, 44, 5);
    expect(s.level).toBe("yellow");
  });

  it("amarillo si la proyección de cierre supera 48h", () => {
    const s = evaluateStatus(20, 60, 8);
    expect(s.level).toBe("yellow");
    expect(s.willExceedMonthly).toBe(true);
  });

  it("rojo solo al superar el límite mensual (48h)", () => {
    const s = evaluateStatus(49, 55, 8);
    expect(s.level).toBe("red");
    expect(s.monthlyExceeded).toBe(true);
  });
});

describe("sumOvertime", () => {
  it("suma extras ignorando registros con error", () => {
    const total = sumOvertime([
      { employeeId: "E1", year: 2026, week: 1, month: 1, totalHours: 50, overtimeHours: 8, isPartial: false, hasError: false },
      { employeeId: "E1", year: 2026, week: 2, month: 1, totalHours: 90, overtimeHours: 0, isPartial: false, hasError: true },
      { employeeId: "E1", year: 2026, week: 3, month: 1, totalHours: 46, overtimeHours: 4, isPartial: false, hasError: false },
    ]);
    expect(total).toBe(12);
  });
});
