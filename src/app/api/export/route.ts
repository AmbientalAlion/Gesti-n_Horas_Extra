import { buildPayrollCsv } from "@/lib/csv";
import { getDashboardData } from "@/lib/data";
import { demoExportRows } from "@/lib/demo";
import type { Period } from "@/lib/aggregate";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const week = Number(searchParams.get("week"));
  const demoOnly = searchParams.get("demo") === "1";

  let rows: Array<{
    employeeId: string;
    name?: string;
    area?: string;
    year: number;
    month: number;
    week: number;
    overtimeHours: number;
    status: string;
  }>;
  let usedPeriod: Period;

  if (demoOnly) {
    const roleParam = searchParams.get("rol") ?? "rrhh";
    const role = (["rrhh", "director", "jefe"].includes(roleParam)
      ? roleParam
      : "rrhh") as Role;
    const demo = demoExportRows(role);
    rows = demo.rows;
    usedPeriod = demo.period;
  } else {
    const period = year && month && week ? { year, month, week } : undefined;
    const data = await getDashboardData(period);
    usedPeriod = data.period;
    // Novedades depuradas: excluimos empleados sin extras y registros con error
    // (horas huérfanas congeladas para revisión manual).
    rows = data.statuses
      .filter((s) => !s.hasError && s.monthlyOvertime > 0)
      .map((s) => ({
        employeeId: s.code,
        name: s.name,
        area: s.area,
        year: usedPeriod.year,
        month: usedPeriod.month,
        week: usedPeriod.week,
        overtimeHours: s.monthlyOvertime,
        status: s.level,
      }));
  }

  const csv = buildPayrollCsv(rows);
  const filename = `horas_extra_${usedPeriod.year}_${String(usedPeriod.month).padStart(2, "0")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
