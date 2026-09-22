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

/** Cambia el rol de un usuario existente. */
export async function updateRole(formData: FormData) {
  await requireRrhh();
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as Role;
  if (!id || !ROLES.includes(role)) throw new Error("Datos inválidos.");

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/** Vincula (o desvincula) un empleado con su jefe inmediato. */
export async function assignManager(formData: FormData) {
  await requireRrhh();
  const employeeId = String(formData.get("employeeId"));
  const managerId = String(formData.get("managerId") || "");
  if (!employeeId) throw new Error("Datos inválidos.");

  const supabase = createClient();
  const { error } = await supabase
    .from("employees")
    .update({ manager_id: managerId || null })
    .eq("id", employeeId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
