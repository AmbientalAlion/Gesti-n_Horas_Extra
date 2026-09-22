import { NextResponse } from "next/server";
import { parseBiometricCsv } from "@/lib/csv";
import { buildWeeklyRecord } from "@/lib/overtime";
import { getSessionProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface UploadResult {
  processed: number;
  withError: number;
  persisted: boolean;
  demo: boolean;
  errors: string[];
  preview: Array<{
    code: string;
    name?: string;
    area?: string;
    totalHours: number;
    overtimeHours: number;
    hasError: boolean;
    errorReason?: string;
  }>;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const year = Number(form.get("year"));
  const week = Number(form.get("week"));
  const month = Number(form.get("month"));
  const cutType = String(form.get("cutType") ?? "final");
  const isPartial = cutType === "parcial";
  const demoOnly = String(form.get("demo") ?? "") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió el archivo CSV." }, { status: 400 });
  }
  if (!year || !week || !month) {
    return NextResponse.json(
      { error: "Año, mes y semana son obligatorios." },
      { status: 400 }
    );
  }

  const content = await file.text();
  const { rows, errors } = parseBiometricCsv(content);

  const records = rows.map((row) =>
    buildWeeklyRecord(row, { year, week, month, isPartial })
  );

  const preview = records.map((r, i) => ({
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
    errors,
    preview,
  };

  // Modo demo o sin Supabase: solo validación, sin persistir.
  if (demoOnly || !isSupabaseConfigured()) {
    return NextResponse.json({ ...result, demo: true });
  }

  // Solo RRHH puede persistir.
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "rrhh") {
    return NextResponse.json(
      { error: "Solo Recursos Humanos puede cargar archivos." },
      { status: 403 }
    );
  }

  const supabase = createClient();

  // 1. Upsert de empleados por código (crea los que no existan).
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

  // 2. Resolver ids de empleados.
  const { data: employees } = await supabase
    .from("employees")
    .select("id, code")
    .in(
      "code",
      rows.map((r) => r.employeeId)
    );
  const idByCode = new Map((employees ?? []).map((e) => [e.code, e.id]));

  // 3. Upsert de registros semanales (sobrescribe cortes parciales/finales).
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

  // 4. Auditoría.
  await supabase.from("uploads").insert({
    uploaded_by: profile.id,
    file_name: file.name,
    cut_type: cutType,
    year,
    week,
    rows_processed: records.length,
    rows_with_error: withError,
  });

  result.persisted = true;
  return NextResponse.json(result);
}
