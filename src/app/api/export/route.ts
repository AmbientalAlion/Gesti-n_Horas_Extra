import { createHash } from "node:crypto";
import { getPayrollData, getSessionProfile } from "@/lib/data";
import { demoPayrollRows, isSupabaseConfigured } from "@/lib/demo";
import type { Role } from "@/lib/types";
import { buildPayrollCsv, payrollTotals } from "@/lib/payroll";
import { currentPeriodInfo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function text(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...NO_STORE },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cur = currentPeriodInfo();
  const y = Number(searchParams.get("year"));
  const m = Number(searchParams.get("month"));
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : cur.year;
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : cur.month;

  // Demo pública: datos ficticios, sin sesión.
  if (searchParams.get("demo") === "1") {
    const r = searchParams.get("rol") ?? "rrhh";
    const role = (["rrhh", "director", "jefe"].includes(r) ? r : "rrhh") as Role;
    const demo = demoPayrollRows(role);
    return new Response(buildPayrollCsv(demo.rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="horas_extra_demo.csv"`,
        ...NO_STORE,
      },
    });
  }

  // Con Supabase configurado, solo RRHH descarga el archivo de nómina.
  if (isSupabaseConfigured()) {
    const profile = await getSessionProfile();
    if (!profile) return text(401, "Inicie sesión para descargar el archivo de nómina.");
    if (profile.role !== "rrhh") {
      return text(403, "Solo Recursos Humanos puede descargar el archivo de nómina.");
    }
  }

  const { rows, period, demo } = await getPayrollData(year, month);
  const csv = buildPayrollCsv(rows);

  if (!demo) {
    // Bitácora (quién, cuándo, qué mes y huella del archivo). Si la tabla aún
    // no existe, la descarga no se bloquea.
    const t = payrollTotals(rows);
    const supabase = createClient();
    await supabase.from("payroll_exports").insert({
      year: period.year,
      month: period.month,
      month_closed: period.status === "cerrado",
      row_count: rows.length,
      total_hours: t.hours,
      pending_weeks: t.pendingWeeks,
      sha256: createHash("sha256").update(csv).digest("hex"),
    });
  }

  const filename = `horas_extra_${period.year}_${String(period.month).padStart(2, "0")}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...NO_STORE,
    },
  });
}
