"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/data";
import type { Role } from "@/lib/types";

async function requireRrhh() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "rrhh") {
    throw new Error("Solo Recursos Humanos puede administrar usuarios.");
  }
  return profile;
}

const ROLES: Role[] = ["rrhh", "director", "jefe"];

type Supa = ReturnType<typeof createClient>;

/** Deja constancia del cambio (RF-28). Si la bitácora no existe aún, no bloquea. */
async function logChange(
  supabase: Supa,
  entry: { user_id?: string; employee_id?: string; field: string; old_value: string | null; new_value: string | null }
) {
  await supabase.from("access_log").insert(entry);
}

/** Cambia el rol de un usuario ("" = sin rol: no ve datos). */
export async function updateRole(formData: FormData) {
  const me = await requireRrhh();
  const id = String(formData.get("id"));
  const raw = String(formData.get("role") ?? "");
  const role = raw === "" ? null : (raw as Role);
  if (!id || (role !== null && !ROLES.includes(role))) throw new Error("Datos inválidos.");
  if (id === me.id && role !== "rrhh") {
    throw new Error("No puede quitarse a sí mismo el rol de Recursos Humanos.");
  }

  const supabase = createClient();
  const { data: before } = await supabase.from("profiles").select("role").eq("id", id).single();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  await logChange(supabase, { user_id: id, field: "role", old_value: before?.role ?? null, new_value: role });
  revalidatePath("/admin");
}

/** Direcciones que puede ver un director ("*" = todas). */
export async function setDirecciones(formData: FormData) {
  await requireRrhh();
  const id = String(formData.get("id"));
  if (!id) throw new Error("Datos inválidos.");
  const all = formData.get("todas") === "on";
  const list = all
    ? ["*"]
    : [...new Set(formData.getAll("direccion").map((d) => String(d).trim()).filter(Boolean))];

  const supabase = createClient();
  const { data: before } = await supabase
    .from("user_direcciones")
    .select("direccion")
    .eq("user_id", id);
  const { error: delError } = await supabase.from("user_direcciones").delete().eq("user_id", id);
  if (delError) throw new Error(delError.message);
  if (list.length > 0) {
    const { error } = await supabase
      .from("user_direcciones")
      .insert(list.map((direccion) => ({ user_id: id, direccion })));
    if (error) throw new Error(error.message);
  }
  await logChange(supabase, {
    user_id: id,
    field: "direcciones",
    old_value: (before ?? []).map((d) => d.direccion).sort().join(", ") || null,
    new_value: list.sort().join(", ") || null,
  });
  revalidatePath("/admin");
}

/** Vincula (o desvincula) un empleado con su jefe inmediato. */
export async function assignManager(formData: FormData) {
  await requireRrhh();
  const employeeId = String(formData.get("employeeId"));
  const managerId = String(formData.get("managerId") || "");
  if (!employeeId) throw new Error("Datos inválidos.");

  const supabase = createClient();
  const { data: before } = await supabase
    .from("employees")
    .select("manager_id")
    .eq("id", employeeId)
    .single();
  const { error } = await supabase
    .from("employees")
    .update({ manager_id: managerId || null })
    .eq("id", employeeId);
  if (error) throw new Error(error.message);
  await logChange(supabase, {
    employee_id: employeeId,
    field: "manager",
    old_value: before?.manager_id ?? null,
    new_value: managerId || null,
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
