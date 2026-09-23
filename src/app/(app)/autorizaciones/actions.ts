"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, currentPeriod } from "@/lib/data";
import { RULES } from "@/lib/overtime";

type Supa = ReturnType<typeof createClient>;

/** Fechas ISO (yyyy-mm-dd) de los 7 días de la semana en curso. */
function currentWeekIsoDays(): string[] {
  const now = new Date();
  const dow = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });
}

/**
 * Consumo mensual de horas extra de un empleado: horas ya trabajadas del mes
 * (weekly_records) + autorizaciones activas del mes (solicitadas/aprobadas).
 * Es la base para hacer cumplir el límite legal DURO de 48h/mes en servidor.
 */
async function monthlyUsage(
  supabase: Supa,
  employeeId: string,
  year: number,
  month: number,
  excludeId?: string
): Promise<number> {
  const [{ data: recs }, { data: auths }] = await Promise.all([
    supabase
      .from("weekly_records")
      .select("overtime_hours, has_error")
      .eq("employee_id", employeeId)
      .eq("year", year)
      .eq("month", month),
    supabase
      .from("overtime_authorizations")
      .select("id, hours, day_date, status")
      .eq("employee_id", employeeId)
      .in("status", ["solicitada", "aprobada"]),
  ]);

  const real = (recs ?? [])
    .filter((r: any) => !r.has_error)
    .reduce((a: number, r: any) => a + Number(r.overtime_hours ?? 0), 0);

  const authorized = (auths ?? [])
    .filter((r: any) => (excludeId ? r.id !== excludeId : true))
    .filter(
      (r: any) =>
        r.day_date &&
        Number(String(r.day_date).slice(0, 4)) === year &&
        Number(String(r.day_date).slice(5, 7)) === month
    )
    .reduce((a: number, r: any) => a + Number(r.hours ?? 0), 0);

  return Math.round((real + authorized) * 100) / 100;
}

/** Un jefe (o RRHH) solicita autorización de horas extra para un empleado. */
export async function solicitarAutorizacion(formData: FormData) {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "jefe" && profile.role !== "rrhh")) {
    throw new Error("Solo un jefe o RRHH puede solicitar autorizaciones.");
  }
  const employeeId = String(formData.get("employeeId"));
  const hours = Number(formData.get("hours"));
  const reason = String(formData.get("reason") ?? "").trim();
  // Uno o varios días de la semana en curso (ISO yyyy-mm-dd), sin duplicados.
  const days = [
    ...new Set(
      formData
        .getAll("days")
        .map((d) => String(d))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    ),
  ];

  // La semana siempre es la actual (regla de simplificación).
  const { year, week, month } = currentPeriod();

  if (!employeeId || !Number.isFinite(hours) || hours <= 0) {
    throw new Error("Datos inválidos.");
  }
  if (hours > RULES.MAX_AUTHORIZATION_HOURS) {
    throw new Error(`El máximo por día es ${RULES.MAX_AUTHORIZATION_HOURS} horas.`);
  }
  if (days.length === 0) {
    throw new Error("Seleccione al menos un día de la semana.");
  }
  // Los días deben pertenecer a la semana en curso (no se confía en el cliente).
  const validDays = currentWeekIsoDays();
  if (days.some((d) => !validDays.includes(d))) {
    throw new Error("Solo se pueden autorizar días de la semana en curso.");
  }

  const supabase = createClient();

  // No permitir dos solicitudes activas para el mismo empleado y día.
  const { data: dup } = await supabase
    .from("overtime_authorizations")
    .select("day_date")
    .eq("employee_id", employeeId)
    .in("status", ["solicitada", "aprobada"])
    .in("day_date", days);
  if (dup && dup.length > 0) {
    throw new Error(
      "Ya existe una solicitud activa para alguno de los días seleccionados."
    );
  }

  // Hacer cumplir el límite legal DURO mensual (48h) en el servidor.
  const used = await monthlyUsage(supabase, employeeId, year, month);
  const requested = Math.round(hours * days.length * 100) / 100;
  if (used + requested > RULES.MONTHLY_OVERTIME_LIMIT) {
    throw new Error(
      `La solicitud superaría el límite legal mensual de ${RULES.MONTHLY_OVERTIME_LIMIT}h ` +
        `(acumulado ${used.toFixed(1)}h + ${requested.toFixed(1)}h solicitadas).`
    );
  }

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

  // Al APROBAR, verificar de nuevo el tope mensual (una solicitud pudo crearse
  // cuando había margen y aprobarse cuando ya no lo hay).
  if (decision === "aprobada") {
    const { data: row } = await supabase
      .from("overtime_authorizations")
      .select("employee_id, hours, day_date")
      .eq("id", id)
      .single();
    if (row?.day_date) {
      const year = Number(String(row.day_date).slice(0, 4));
      const month = Number(String(row.day_date).slice(5, 7));
      const used = await monthlyUsage(supabase, row.employee_id, year, month, id);
      if (used + Number(row.hours) > RULES.MONTHLY_OVERTIME_LIMIT) {
        throw new Error(
          `Aprobarla superaría el límite legal mensual de ${RULES.MONTHLY_OVERTIME_LIMIT}h ` +
            `(acumulado ${used.toFixed(1)}h + ${Number(row.hours).toFixed(1)}h).`
        );
      }
    }
  }

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
