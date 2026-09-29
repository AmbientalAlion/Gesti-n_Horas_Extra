import { NextResponse } from "next/server";
import {
  parseBiometricCsv,
  parseOvertimeEventsCsv,
  isOvertimeEventsCsv,
} from "@/lib/csv";
import { buildWeeklyRecord, round2 } from "@/lib/overtime";
import { distribute, splitWeek } from "@/lib/ingest";
import { formatDayLong, isoDate, isoWeekMonday, parseIsoDate } from "@/lib/dates";

const isoMonday = (y: number, w: number) => isoDate(isoWeekMonday(y, w));
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
  /** Primer y último día con datos del archivo. */
  range?: { from: string; to: string; label: string };
  /** Tramos con horas repartidas por días (semana que cruza de mes sin detalle). */
  estimatedSegments?: number;
  /** Registros ya revisados que la carga no modificó (RF-24). */
  skippedReviewed?: number;
}

type Supa = ReturnType<typeof createClient>;

/** Rango legible «del 1 al 20 de septiembre». */
function rangeOf(dates: string[]): UploadResult["range"] {
  const sorted = dates.filter(Boolean).sort();
  if (sorted.length === 0) return undefined;
  const a = parseIsoDate(sorted[0]);
  const b = parseIsoDate(sorted[sorted.length - 1]);
  if (!a || !b) return undefined;
  return {
    from: sorted[0],
    to: sorted[sorted.length - 1],
    label:
      a.m === b.m && a.y === b.y
        ? `del ${a.d} al ${formatDayLong(b)}`
        : `del ${formatDayLong(a)} al ${formatDayLong(b)}`,
  };
}

/**
 * Claves (empleado|año|mes|semana) de registros ya revisados o congelados: una
 * recarga no los pisa, para no deshacer una corrección o un descarte (RF-24).
 */
async function protectedKeys(supabase: Supa, employeeIds: string[], months: { y: number; m: number }[]) {
  const keys = new Set<string>();
  if (employeeIds.length === 0 || months.length === 0) return keys;
  const filter = months.map((x) => `and(year.eq.${x.y},month.eq.${x.m})`).join(",");
  const { data, error } = await supabase
    .from("weekly_records")
    .select("employee_id, year, month, week, has_error, review_status")
    .in("employee_id", employeeIds)
    .or(filter);
  if (error) throw new Error(`No se pudieron leer los registros existentes: ${error.message}`);
  for (const r of data ?? []) {
    if (r.review_status || r.has_error) keys.add(`${r.employee_id}|${r.year}|${r.month}|${r.week}`);
  }
  return keys;
}

function monthsOf(rows: { year: number; month: number }[]) {
  const m = new Map<string, { y: number; m: number }>();
  for (const r of rows) m.set(`${r.year}-${r.month}`, { y: r.year, m: r.month });
  return [...m.values()];
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
    const range = rangeOf(rows.map((r) => r.lastDate));

    const result: UploadResult = {
      processed: rows.length,
      withError: 0,
      persisted: false,
      demo: !isSupabaseConfigured(),
      format: "eventos",
      errors,
      preview,
      range,
      estimatedSegments: 0,
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
      { code: string; name: string | null; area: string | null; direccion: string | null; cost_center: string | null; plant: string | null; manager_name: string | null }
    >();
    for (const r of rows) {
      if (!empByCode.has(r.code)) {
        empByCode.set(r.code, {
          code: r.code,
          name: r.name ?? null,
          area: r.area ?? null,
          direccion: r.direccion ?? null,
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

    // 2. Registros por tramo con desglose de recargos. El archivo de novedades
    //    no trae horas totales: no se inventan (total_hours = null).
    let skipped: Set<string>;
    try {
      skipped = await protectedKeys(supabase, [...idByCode.values()], monthsOf(rows));
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
    let skippedReviewed = 0;
    const recordUpserts = rows
      .map((r) => {
        const employeeId = idByCode.get(r.code);
        if (!employeeId) return null;
        if (skipped.has(`${employeeId}|${r.year}|${r.month}|${r.week}`)) {
          skippedReviewed += 1;
          return null;
        }
        return {
          employee_id: employeeId,
          year: r.year,
          week: r.week,
          month: r.month,
          total_hours: null,
          source: "novedades",
          last_date: r.lastDate,
          estimated: false,
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
      .upsert(recordUpserts, { onConflict: "employee_id,year,month,week" });
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

    return NextResponse.json({ ...result, skippedReviewed, persisted: true });
  }

  // ---------- Formato legacy (ID, Rol, Área, Horas Totales) ----------
  // Semana ISO del archivo (año y número) y, en un corte parcial, el último
  // día con datos. La semana se reparte en tramos por mes.
  const year = Number(form.get("year"));
  const week = Number(form.get("week"));
  const cutType = String(form.get("cutType") ?? "final");
  const isPartial = cutType === "parcial";
  const untilRaw = String(form.get("until") ?? "").trim();
  const until = untilRaw && parseIsoDate(untilRaw) ? untilRaw : undefined;

  if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(week) || week < 1 || week > 53) {
    return NextResponse.json(
      { error: "Indique el año y la semana del archivo para el formato simple." },
      { status: 400 }
    );
  }
  if (isPartial && !until) {
    return NextResponse.json(
      { error: "En un corte parcial indique hasta qué día trae datos el archivo." },
      { status: 400 }
    );
  }

  const shares = splitWeek(year, week, isPartial ? until : undefined);
  const { rows, errors } = parseBiometricCsv(utf8);
  const records = rows.map((row) =>
    buildWeeklyRecord(row, { year: shares[0].year, week, month: shares[0].month, isPartial })
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
    range: rangeOf([isoMonday(year, week), shares[shares.length - 1].lastDate]),
    estimatedSegments: shares.filter((x) => x.estimated).length,
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

  let skipped: Set<string>;
  try {
    skipped = await protectedKeys(
      supabase,
      [...idByCode.values()],
      shares.map((x) => ({ y: x.year, m: x.month }))
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  let skippedReviewed = 0;
  // Un registro por empleado y tramo; las horas se reparten por días.
  const recordUpserts = records.flatMap((r) => {
    const employeeId = idByCode.get(r.employeeId);
    if (!employeeId) return [];
    const total = distribute(r.totalHours, shares);
    const extra = distribute(r.overtimeHours, shares);
    return shares.flatMap((sh, i) => {
      if (skipped.has(`${employeeId}|${sh.year}|${sh.month}|${sh.week}`)) {
        skippedReviewed += 1;
        return [];
      }
      return [
        {
          employee_id: employeeId,
          year: sh.year,
          week: sh.week,
          month: sh.month,
          total_hours: total[i],
          source: "biometrico",
          last_date: sh.lastDate,
          estimated: sh.estimated,
          overtime_hours: extra[i],
          is_partial: r.isPartial,
          has_error: r.hasError,
          error_reason: r.errorReason ?? null,
          max_shift_hours: r.maxShiftHours ?? null,
        },
      ];
    });
  });

  const { error: recError } = await supabase
    .from("weekly_records")
    .upsert(recordUpserts, { onConflict: "employee_id,year,month,week" });
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

  return NextResponse.json({ ...result, skippedReviewed, persisted: true });
}
