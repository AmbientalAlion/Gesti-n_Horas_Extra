"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/data";
import { calculateWeeklyOvertime } from "@/lib/overtime";

async function requireRrhh() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "rrhh") {
    throw new Error("Solo Recursos Humanos puede revisar registros.");
  }
  return profile;
}

/** Corrige un registro congelado: ajusta las horas y lo reincorpora al cálculo. */
export async function corregirRegistro(formData: FormData) {
  const profile = await requireRrhh();
  const id = String(formData.get("id"));
  const nuevasHoras = Number(formData.get("horas"));
  const nota = String(formData.get("nota") ?? "").trim();

  if (!id || !Number.isFinite(nuevasHoras) || nuevasHoras < 0) {
    throw new Error("Datos inválidos.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("weekly_records")
    .update({
      total_hours: nuevasHoras,
      overtime_hours: calculateWeeklyOvertime(nuevasHoras),
      has_error: false,
      error_reason: null,
      review_status: "corregido",
      review_note: nota || null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/revisiones");
  revalidatePath("/dashboard");
}

/** Descarta un registro congelado: revisado, no se contabiliza. */
export async function descartarRegistro(formData: FormData) {
  const profile = await requireRrhh();
  const id = String(formData.get("id"));
  const nota = String(formData.get("nota") ?? "").trim();
  if (!id) throw new Error("Datos inválidos.");

  const supabase = createClient();
  const { error } = await supabase
    .from("weekly_records")
    .update({
      review_status: "descartado",
      review_note: nota || null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/revisiones");
  revalidatePath("/dashboard");
}
