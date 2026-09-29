"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Dominio interno de las cuentas sin correo real: quien escribe «admin»
 * entra como admin@alion.local.
 */
const LOCAL_DOMAIN = "alion.local";

export async function login(formData: FormData) {
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const email = raw.includes("@") ? raw : `${raw}@${LOCAL_DOMAIN}`;
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje fijo: no se refleja el texto del servidor en la URL.
    redirect("/login?error=credenciales");
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
