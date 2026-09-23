"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, currentPeriod } from "@/lib/data";
import { RULES } from "@/lib/overtime";

/** Un jefe (o RRHH) solicita autorización de horas extra para un empleado. */
export async function solicitarAutorizacion(formData: FormData) {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "jefe" && profile.role !== "rrhh")) {
    throw new Error("Solo un jefe o RRHH puede solicitar autorizaciones.");
  }
  const employeeId = String(formData.get("employeeId"));
  const hours = Number(formData.get("hours"));
  const reason = String(formData.get("reason") ?? "").trim();
  // Uno o varios días de la semana en curso (ISO yyyy-mm-dd).
  const days = formData
    .getAll("days")
    .map((d) => String(d))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  // La semana siempre es la actual (regla de simplificación).
  const { year, week } = currentPeriod();

  if (!employeeId || !Number.isFinite(hours) || hours <= 0) {
    throw new Error("Datos inválidos.");
  }
  if (hours > RULES.MAX_AUTHORIZATION_HOURS) {
    throw new Error(
      `El máximo por día es ${RULES.MAX_AUTHORIZATION_HOURS} horas.`
    );
  }
  if (days.length === 0) {
    throw new Error("Seleccione al menos un día de la semana.");
  }

  const supabase = createClient();
  // Una fila por día seleccionado (permite solicitar toda la semana de una vez).
  const rows = days.map((day) => ({
    employee_id: employeeId,
    year,
    week,
    day_date: day,
    hours,
    reason: reason || null,
    requested_by: profile.id,
    status: "solicitada",
  }));
  const { error } = await supabase.from("overtime_authorizations").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/autorizaciones");
}

/** RRHH o el Director aprueban/rechazan (queda la firma: quién y cuándo). */
export async function decidirAutorizacion(formData: FormData) {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "rrhh" && profile.role !== "director")) {
    throw new Error("Solo RRHH o el Director pueden decidir autorizaciones.");
  }
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim();
  if (!id || (decision !== "aprobada" && decision !== "rechazada")) {
    throw new Error("Datos inválidos.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("overtime_authorizations")
    .update({
      status: decision,
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
      decision_note: note || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/autorizaciones");
}
