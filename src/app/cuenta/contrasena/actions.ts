"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface PasswordState {
  error?: string;
}

/** Cambia la contraseña del usuario actual y apaga el aviso de contraseña temporal. */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { error: "Use letras y al menos un número." };
  }
  if (password !== confirm) return { error: "Las dos contraseñas no coinciden." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: /same|different/i.test(error.message)
        ? "La nueva contraseña debe ser distinta de la actual."
        : "No se pudo cambiar la contraseña. Inténtelo de nuevo.",
    };
  }
  await supabase.rpc("password_changed");
  redirect("/dashboard");
}
