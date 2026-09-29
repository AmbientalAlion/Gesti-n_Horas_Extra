"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminApiConfigured, temporaryPassword } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/data";
import type { Role } from "@/lib/types";

/** Resultado de una acción: se muestra en el formulario (no se lanza). */
export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Contraseña temporal para entregar a la persona (se muestra una sola vez). */
  tempPassword?: string;
  email?: string;
}

type Supa = ReturnType<typeof createClient>;

const LEVELS: Role[] = ["rrhh", "director", "jefe"];
const DIMS = ["direccion", "planta", "area"] as const;

async function requireRrhh() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "rrhh") return null;
  return profile;
}

const NOT_ALLOWED: ActionState = { error: "Solo Recursos Humanos puede administrar usuarios y roles." };

/** Deja constancia del cambio (RF-28). */
async function logChange(
  supabase: Supa,
  entry: { user_id?: string; employee_id?: string; field: string; old_value: string | null; new_value: string | null }
) {
  await supabase.from("access_log").insert(entry);
}

function cleanEmail(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}

/* ------------------------------------------------------------------ */
/* Usuarios                                                            */
/* ------------------------------------------------------------------ */

/**
 * Crea una cuenta con su correo, le asigna un rol y genera una contraseña
 * temporal. La persona debe cambiarla la primera vez que entra.
 */
export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireRrhh())) return NOT_ALLOWED;
  if (!isAdminApiConfigured()) {
    return { error: "Falta configurar la llave de servicio de Supabase en Vercel (SUPABASE_SERVICE_ROLE_KEY)." };
  }
  const email = cleanEmail(formData.get("email"));
  const fullName = String(formData.get("fullName") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "");
  if (!email) return { error: "Escriba un correo válido." };
  if (!fullName) return { error: "Escriba el nombre de la persona." };
  if (!roleId) return { error: "Elija un rol." };

  const admin = createAdminClient();
  const password = temporaryPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return {
      error: exists
        ? "Ya existe una cuenta con ese correo. Búsquela en la lista y cámbiele el rol."
        : "No se pudo crear la cuenta. Revise el correo e inténtelo de nuevo.",
    };
  }

  const supabase = createClient();
  const { error: pErr } = await supabase
    .from("profiles")
    .update({ access_role_id: roleId, full_name: fullName, must_change_password: true })
    .eq("id", data.user.id);
  if (pErr) {
    return { error: "La cuenta se creó, pero no se pudo asignar el rol. Asígnelo desde la lista." };
  }
  await logChange(supabase, { user_id: data.user.id, field: "alta", old_value: null, new_value: email });
  revalidatePath("/admin");
  return {
    ok: true,
    email,
    tempPassword: password,
    message: `Cuenta creada para ${email}.`,
  };
}

/** Genera una contraseña temporal nueva para un usuario. */
export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireRrhh())) return NOT_ALLOWED;
  if (!isAdminApiConfigured()) {
    return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel." };
  }
  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "");
  if (!id) return { error: "Datos inválidos." };

  const password = temporaryPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { error: "No se pudo restablecer la contraseña." };

  const supabase = createClient();
  await supabase.from("profiles").update({ must_change_password: true }).eq("id", id);
  await logChange(supabase, { user_id: id, field: "contrasena", old_value: null, new_value: "temporal" });
  return { ok: true, email, tempPassword: password, message: "Contraseña temporal nueva." };
}

/** Asigna un rol de acceso a un usuario ("" = sin rol: no ve datos). */
export async function assignRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRrhh();
  if (!me) return NOT_ALLOWED;
  const id = String(formData.get("id") ?? "");
  const roleId = String(formData.get("roleId") ?? "") || null;
  if (!id) return { error: "Datos inválidos." };

  const supabase = createClient();
  if (id === me.id) {
    const { data: r } = roleId
      ? await supabase.from("access_roles").select("level").eq("id", roleId).single()
      : { data: null };
    if (r?.level !== "rrhh") return { error: "No puede quitarse a sí mismo el acceso de Recursos Humanos." };
  }
  const { data: before } = await supabase
    .from("profiles")
    .select("access_role_id, access_roles!profiles_access_role_id_fkey(name)")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("profiles").update({ access_role_id: roleId }).eq("id", id);
  if (error) return { error: "No se pudo guardar el rol." };
  const { data: after } = roleId
    ? await supabase.from("access_roles").select("name").eq("id", roleId).single()
    : { data: null };
  const beforeName = (before as any)?.access_roles?.name ?? null;
  await logChange(supabase, {
    user_id: id,
    field: "rol_acceso",
    old_value: beforeName,
    new_value: after?.name ?? null,
  });
  revalidatePath("/admin");
  return { ok: true, message: "Rol guardado." };
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

/** Crea o edita un rol: nombre, nivel y alcance (direcciones, plantas, áreas). */
export async function saveRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireRrhh())) return NOT_ALLOWED;
  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const level = String(formData.get("level") ?? "") as Role;
  const scopeAll = formData.get("scopeAll") === "on";
  if (!name) return { error: "Escriba el nombre del rol." };
  if (!LEVELS.includes(level)) return { error: "Elija qué puede hacer el rol." };

  const scopes = DIMS.flatMap((dim) =>
    [...new Set(formData.getAll(dim).map((v) => String(v).trim()).filter(Boolean))].map((value) => ({
      dim,
      value,
    }))
  );
  if (level === "director" && !scopeAll && scopes.length === 0) {
    return { error: "Elija qué puede ver el rol: toda la organización o al menos una dirección, planta o área." };
  }

  const supabase = createClient();
  if (id) {
    const { data: cur } = await supabase.from("access_roles").select("system, level, name").eq("id", id).single();
    if (cur?.system && cur.level === "rrhh" && level !== "rrhh") {
      return { error: "El rol Recursos Humanos no puede perder el nivel de administración." };
    }
  }

  const row = {
    name,
    description,
    level,
    scope_all: level === "rrhh" ? true : level === "jefe" ? false : scopeAll,
  };
  const res = id
    ? await supabase.from("access_roles").update(row).eq("id", id).select("id").single()
    : await supabase.from("access_roles").insert(row).select("id").single();
  if (res.error || !res.data) {
    return {
      error: /duplicate|unique/i.test(res.error?.message ?? "")
        ? "Ya existe un rol con ese nombre."
        : "No se pudo guardar el rol.",
    };
  }
  const roleId = res.data.id as string;

  // El alcance solo aplica al nivel «consulta por alcance».
  await supabase.from("access_role_scopes").delete().eq("role_id", roleId);
  if (level === "director" && !scopeAll && scopes.length > 0) {
    const { error } = await supabase
      .from("access_role_scopes")
      .insert(scopes.map((s) => ({ role_id: roleId, ...s })));
    if (error) return { error: "El rol se guardó, pero no su alcance. Inténtelo de nuevo." };
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: id ? `Rol «${name}» actualizado.` : `Rol «${name}» creado.` };
}

/** Borra un rol que no sea del sistema ni tenga usuarios. */
export async function deleteRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await requireRrhh())) return NOT_ALLOWED;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Datos inválidos." };
  const supabase = createClient();
  const { data: role } = await supabase.from("access_roles").select("system, name").eq("id", id).single();
  if (!role) return { error: "El rol ya no existe." };
  if (role.system) return { error: "Los roles base no se pueden borrar." };
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("access_role_id", id);
  if ((count ?? 0) > 0) {
    return { error: `«${role.name}» tiene ${count} usuario${count === 1 ? "" : "s"}: cámbieles el rol antes de borrarlo.` };
  }
  const { error } = await supabase.from("access_roles").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar el rol." };
  revalidatePath("/admin");
  return { ok: true, message: `Rol «${role.name}» borrado.` };
}

/* ------------------------------------------------------------------ */
/* Equipos                                                             */
/* ------------------------------------------------------------------ */

/** Vincula (o desvincula) un empleado con su jefe inmediato. */
export async function assignManager(formData: FormData) {
  if (!(await requireRrhh())) throw new Error("Solo Recursos Humanos puede administrar equipos.");
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
  if (error) throw new Error("No se pudo guardar el jefe.");
  await logChange(supabase, {
    employee_id: employeeId,
    field: "manager",
    old_value: before?.manager_id ?? null,
    new_value: managerId || null,
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
