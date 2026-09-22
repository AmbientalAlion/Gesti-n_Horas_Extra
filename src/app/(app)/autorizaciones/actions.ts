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

  // La semana siempre es la actual (regla de simplificación).
  const { year, week } = currentPeriod();

  if (!employeeId || !Number.isFinite(hours) || hours <= 0) {
    throw new Error("Datos inválidos.");
  }
  if (hours > RULES.MAX_AUTHORIZATION_HOURS) {
    throw new Error(
      `El máximo por solicitud es ${RULES.MAX_AUTHORIZATION_HOURS} horas.`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.from("overtime_authorizations").insert({
    employee_id: employeeId,
    year,
    week,
    hours,
    reason: reason || null,
    requested_by: profile.id,
    status: "solicitada",
  });
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
