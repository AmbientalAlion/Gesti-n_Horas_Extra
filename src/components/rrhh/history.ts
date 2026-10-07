import { isSupabaseConfigured } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { formatWeekLabel, PLANT_TZ } from "@/lib/dates";

// Lecturas de solo consulta para los historiales de las pantallas de RRHH
// (cargas y descargas de nómina). Si la tabla no existe o falla la consulta,
// devuelven una lista vacía: el historial nunca bloquea la página.

export interface UploadEntry {
  id: string;
  fileName: string;
  when: string;
  who: string | null;
  period: string;
  cutType: "parcial" | "final";
  rows: number;
  frozen: number;
}

export interface ExportEntry {
  id: string;
  when: string;
  who: string | null;
  rows: number;
  hours: number;
  pendingWeeks: number;
  monthClosed: boolean;
  sha: string;
}

/** «30 sep 2026, 4:12 p. m.» en hora de planta. */
export function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      timeZone: PLANT_TZ,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function namesOf(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", unique);
  for (const p of data ?? []) map.set(p.id, p.full_name ?? p.email);
  return map;
}

export async function getRecentUploads(limit = 5): Promise<UploadEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("uploads")
      .select("id, file_name, cut_type, year, week, rows_processed, rows_with_error, created_at, uploaded_by")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const names = await namesOf(data.map((u) => u.uploaded_by));
    return data.map((u) => ({
      id: u.id,
      fileName: u.file_name ?? "Archivo sin nombre",
      when: fmtWhen(u.created_at),
      who: u.uploaded_by ? names.get(u.uploaded_by) ?? null : null,
      period: formatWeekLabel(u.year, u.week),
      cutType: u.cut_type === "parcial" ? "parcial" : "final",
      rows: u.rows_processed ?? 0,
      frozen: u.rows_with_error ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getMonthExports(year: number, month: number, limit = 10): Promise<ExportEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payroll_exports")
      .select("id, exported_at, exported_by, row_count, total_hours, pending_weeks, month_closed, sha256")
      .eq("year", year)
      .eq("month", month)
      .order("exported_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const names = await namesOf(data.map((e) => e.exported_by));
    return data.map((e) => ({
      id: e.id,
      when: fmtWhen(e.exported_at),
      who: e.exported_by ? names.get(e.exported_by) ?? null : null,
      rows: e.row_count ?? 0,
      hours: Number(e.total_hours ?? 0),
      pendingWeeks: e.pending_weeks ?? 0,
      monthClosed: !!e.month_closed,
      sha: String(e.sha256 ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Fecha y hora de la última carga (para la lista de comprobación de nómina). */
export async function getLastUploadWhen(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("uploads")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.created_at ? fmtWhen(data.created_at) : null;
  } catch {
    return null;
  }
}
