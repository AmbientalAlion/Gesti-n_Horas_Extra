import { NextResponse } from "next/server";
import {
  parseBiometricCsv,
  parseOvertimeEventsCsv,
  isOvertimeEventsCsv,
} from "@/lib/csv";
import { buildWeeklyRecord, round2 } from "@/lib/overtime";
import { getSessionProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PreviewRow {
  code: string;
  name?: string;
  area?: string;
  totalHours: number;
  overtimeHours: number;
  hasError: boolean;
  errorReason?: string;
}

interface UploadResult {
  processed: number;
  withError: number;
  persisted: boolean;
  demo: boolean;
  format: "eventos" | "legacy";
  errors: string[];
  preview: PreviewRow[];
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const demoOnly = String(form.get("demo") ?? "") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió el archivo CSV." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const utf8 = buf.toString("utf-8");

  // ---------- Formato real de horas extra (export biométrico) ----------
  if (isOvertimeEventsCsv(utf8)) {
    // Estos archivos vienen en Latin-1; se decodifican correctamente.
    const content = buf.toString("latin1");
    const { rows, errors } = parseOvertimeEventsCsv(content);

    // Vista previa agregada por empleado.
    const byEmp = new Map<string, PreviewRow>();
    for (const r of rows) {
      const e =
        byEmp.get(r.code) ??
        { code: r.code, name: r.name, area: r.area, totalHours: 0, overtimeHours: 0, hasError: false };
      e.overtimeHours = round2(e.overtimeHours + r.overtimeHours);
      e.totalHours = e.overtimeHours;
      byEmp.set(r.code, e);
    }
    const preview = [...byEmp.values()];

    const result: UploadResult = {
      processed: rows.length,
      withError: 0,
      persisted: false,
      demo: !isSupabaseConfigured(),
      format: "eventos",
      errors,
      preview,
    };

    if (demoOnly || !isSupabaseConfigured()) {
      return NextResponse.json({ ...result, demo: true });
    }

    const profile = await getSessionProfile();
    if (!profile || profile.role !== "rrhh") {
      return NextResponse.json(
        { error: "Solo Recursos Humanos puede cargar archivos." },
        { status: 403 }
      );
    }

    const supabase = createClient();

    // 1. Empleados (por cédula) con jefe (texto) y área.
    const empByCode = new Map<
      string,
      { code: string; name: string | null; area: string | null; cost_center: string | null; plant: string | null; manager_name: string | null }
    >();
    for (const r of rows) {
      if (!empByCode.has(r.code)) {
        empByCode.set(r.code, {
          code: r.code,
          name: r.name ?? null,
          area: r.area ?? null,
          cost_center: r.costCenter ?? null,
          plant: r.plant ?? null,
          manager_name: r.managerName ?? null,
        });
      }
    }
    const { error: empError } = await supabase
      .from("employees")
      .upsert([...empByCode.values()], { onConflict: "code" });
    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    const { data: employees } = await supabase
      .from("employees")
      .select("id, code")
      .in("code", [...empByCode.keys()]);
    const idByCode = new Map((employees ?? []).map((e) => [e.code, e.id]));

    // 2. Registros semanales con desglose de recargos.
    const recordUpserts = rows
      .map((r) => {
        const employeeId = idByCode.get(r.code);
        if (!employeeId) return null;
        return {
          employee_id: employeeId,
          year: r.year,
          week: r.week,
          month: r.month,
          total_hours: round2(42 + r.overtimeHours), // base asumida + extra
          overtime_hours: r.overtimeHours,
          is_partial: false,
          has_error: false,
          ot_extra_diurna: r.byConcepto.diurna,
          ot_extra_nocturna: r.byConcepto.nocturna,
          ot_dom_diurna: r.byConcepto.dom_diurna,
          ot_dom_nocturna: r.byConcepto.dom_nocturna,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const { error: recError } = await supabase
      .from("weekly_records")
      .upsert(recordUpserts, { onConflict: "employee_id,year,week" });
    if (recError) {
      return NextResponse.json({ error: recError.message }, { status: 500 });
    }

    const first = rows[0];
    await supabase.from("uploads").insert({
      uploaded_by: profile.id,
      file_name: file.name,
      cut_type: "final",
      year: first?.year ?? new Date().getFullYear(),
      week: first?.week ?? 1,
      rows_processed: rows.length,
      rows_with_error: 0,
    });

    return NextResponse.json({ ...result, persisted: true });
  }

  // ---------- Formato legacy (ID, Rol, Área, Horas Totales) ----------
  const year = Number(form.get("year"));
  const week = Number(form.get("week"));
  const month = Number(form.get("month"));
  const cutType = String(form.get("cutType") ?? "final");
  const isPartial = cutType === "parcial";

  if (!year || !week || !month) {
    return NextResponse.json(
      { error: "Año, mes y semana son obligatorios para el formato simple." },
      { status: 400 }
    );
  }

  const { rows, errors } = parseBiometricCsv(utf8);
  const records = rows.map((row) =>
    buildWeeklyRecord(row, { year, week, month, isPartial })
  );
  const preview: PreviewRow[] = records.map((r, i) => ({
    code: rows[i].employeeId,
    name: rows[i].name,
    area: rows[i].area,
    totalHours: r.totalHours,
    overtimeHours: r.overtimeHours,
    hasError: r.hasError,
    errorReason: r.errorReason,
  }));
  const withError = records.filter((r) => r.hasError).length;

  const result: UploadResult = {
    processed: records.length,
    withError,
    persisted: false,
    demo: !isSupabaseConfigured(),
    format: "legacy",
    errors,
    preview,
  };

  if (demoOnly || !isSupabaseConfigured()) {
    return NextResponse.json({ ...result, demo: true });
  }

  const profile = await getSessionProfile();
  if (!profile || profile.role !== "rrhh") {
    return NextResponse.json(
      { error: "Solo Recursos Humanos puede cargar archivos." },
      { status: 403 }
    );
  }

  const supabase = createClient();
  const employeeUpserts = rows.map((row) => ({
    code: row.employeeId,
    name: row.name ?? null,
    role_title: row.role ?? null,
    area: row.area ?? null,
  }));
  const { error: empError } = await supabase
    .from("employees")
    .upsert(employeeUpserts, { onConflict: "code", ignoreDuplicates: false });
  if (empError) {
    return NextResponse.json({ error: empError.message }, { status: 500 });
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, code")
    .in("code", rows.map((r) => r.employeeId));
  const idByCode = new Map((employees ?? []).map((e) => [e.code, e.id]));

  const recordUpserts = records
    .map((r) => {
      const employeeId = idByCode.get(r.employeeId);
      if (!employeeId) return null;
      return {
        employee_id: employeeId,
        year: r.year,
        week: r.week,
        month: r.month,
        total_hours: r.totalHours,
        overtime_hours: r.overtimeHours,
        is_partial: r.isPartial,
        has_error: r.hasError,
        error_reason: r.errorReason ?? null,
        max_shift_hours: r.maxShiftHours ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error: recError } = await supabase
    .from("weekly_records")
    .upsert(recordUpserts, { onConflict: "employee_id,year,week" });
  if (recError) {
    return NextResponse.json({ error: recError.message }, { status: 500 });
  }

  await supabase.from("uploads").insert({
    uploaded_by: profile.id,
    file_name: file.name,
    cut_type: cutType,
    year,
    week,
    rows_processed: records.length,
    rows_with_error: withError,
  });

  return NextResponse.json({ ...result, persisted: true });
}
