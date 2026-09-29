import { describe, expect, it } from "vitest";
import {
  buildWeeklyRecord,
  calculateWeeklyOvertime,
  detectOrphanHours,
  evaluateMonth,
  fmtH,
  monthlyTarget,
  projectClose,
  round1,
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

describe("monthlyTarget (meta acumulada, D-1)", () => {
  it("CP-02: febrero 2027 da 12 / 24 / 36 / 48", () => {
    expect([7, 14, 21, 28].map(monthlyTarget)).toEqual([12, 24, 36, 48]);
  });
  it("CP-03: septiembre 2026 da 10,3 / 22,3 / 34,3 / 46,3 / 48,0", () => {
    expect([6, 13, 20, 27, 30].map((d) => round1(monthlyTarget(d)))).toEqual([10.3, 22.3, 34.3, 46.3, 48]);
  });
  it("la meta llega a 48h el día 28 y no sube más", () => {
    expect(monthlyTarget(28)).toBe(48);
    expect(monthlyTarget(31)).toBe(48);
    expect(monthlyTarget(0)).toBe(0);
  });
});

describe("projectClose (RF-18/RF-19)", () => {
  it("extiende el ritmo diario hasta fin de mes", () => {
    expect(projectClose(17, 7, 28)).toBe(68);
    expect(projectClose(30, 20, 30)).toBe(45);
  });
  it("mes cerrado o sin datos: el acumulado", () => {
    expect(projectClose(47, 28, 28, true)).toBe(47);
    expect(projectClose(0, 0, 30)).toBe(0);
  });
});

describe("evaluateMonth (estado del mes)", () => {
  const feb = { daysInMonth: 28 };
  it("CP-04: 17h al 7 de feb → En riesgo por meta (+5,0h)", () => {
    const e = evaluateMonth({ ...feb, accumulated: 17, cutoffDay: 7 });
    expect(e).toMatchObject({ level: "yellow", risk: "meta", target: 12, overTarget: 5, projected: 68 });
  });
  it("CP-05: 17h al 14 de feb → Normal, proyección 34h", () => {
    const e = evaluateMonth({ ...feb, accumulated: 17, cutoffDay: 14 });
    expect(e).toMatchObject({ level: "green", risk: null, projected: 34 });
  });
  it("CP-06: 37h al 21 de feb → En riesgo (+1,0h)", () => {
    const e = evaluateMonth({ ...feb, accumulated: 37, cutoffDay: 21 });
    expect(e).toMatchObject({ level: "yellow", risk: "meta", overTarget: 1 });
    expect(round1(e.projected)).toBe(49.3);
  });
  it("CP-07: cierre en 47h → Normal", () => {
    const e = evaluateMonth({ ...feb, accumulated: 47, cutoffDay: 28, closed: true });
    expect(e).toMatchObject({ level: "green", projected: 47 });
  });
  it("CP-08: cierre en 49h → Excedido", () => {
    expect(evaluateMonth({ ...feb, accumulated: 49, cutoffDay: 28, closed: true }).level).toBe("red");
  });
  it("CP-09: igualar la meta no es riesgo", () => {
    expect(evaluateMonth({ ...feb, accumulated: 12, cutoffDay: 7 }).level).toBe("green");
  });
  it("CP-10: 11h en un tramo de 6 días → En riesgo (+0,7h frente a 10,3h)", () => {
    const e = evaluateMonth({ accumulated: 11, cutoffDay: 6, daysInMonth: 30 });
    expect(e.risk).toBe("meta");
    expect(round1(e.overTarget)).toBe(0.7);
  });
  it("CP-13: al 20 de sep, 30h Normal y 33h En riesgo por proyección", () => {
    const a = evaluateMonth({ accumulated: 30, cutoffDay: 20, daysInMonth: 30 });
    expect(a).toMatchObject({ level: "green", projected: 45 });
    const b = evaluateMonth({ accumulated: 33, cutoffDay: 20, daysInMonth: 30 });
    expect(b).toMatchObject({ level: "yellow", risk: "proyeccion", overTarget: 0, projected: 49.5 });
  });
  it("CP-14: con pocos datos decide solo la meta", () => {
    const e = evaluateMonth({ accumulated: 6, cutoffDay: 3, daysInMonth: 30 });
    expect(e).toMatchObject({ risk: "meta", projectionReliable: false, projected: 60 });
    expect(round1(e.overTarget)).toBe(0.9);
    // 4h en 3 días: dentro de la meta (5,1h); la proyección (40h) no decide.
    expect(evaluateMonth({ accumulated: 4, cutoffDay: 3, daysInMonth: 30 }).level).toBe("green");
  });
  it("CP-15: septiembre cerrado en 47h → Normal", () => {
    expect(evaluateMonth({ accumulated: 47, cutoffDay: 30, daysInMonth: 30, closed: true }).level).toBe("green");
  });
  it("CP-24: dentro de la meta pero proyecta 51,1h → En riesgo por proyección", () => {
    const e = evaluateMonth({ accumulated: 46, cutoffDay: 27, daysInMonth: 30 });
    expect(e.risk).toBe("proyeccion");
    expect(round1(e.projected)).toBe(51.1);
  });
  it("usa las cifras redondeadas que se leen (RF-09)", () => {
    expect(evaluateMonth({ ...feb, accumulated: 12.04, cutoffDay: 7 }).level).toBe("green");
  });
});

describe("fmtH", () => {
  it("coma decimal y un decimal", () => {
    expect(fmtH(17)).toBe("17,0h");
    expect(fmtH(49.333)).toBe("49,3h");
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
