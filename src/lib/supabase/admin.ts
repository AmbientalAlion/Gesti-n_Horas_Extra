import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la llave de servicio (SUPABASE_SERVICE_ROLE_KEY). Solo se usa en
// el servidor, dentro de acciones que ya verificaron que quien llama es RRHH,
// y solo para lo que la llave pública no permite: crear cuentas y cambiar
// contraseñas. Nunca se envía al navegador (no lleva el prefijo NEXT_PUBLIC_).

export function isAdminApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios."
    );
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Contraseña temporal legible: 14 caracteres sin ambiguos (0/O, 1/l). */
export function temporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  // Garantiza al menos una mayúscula, una minúscula y un número.
  return out.slice(0, 11) + "Ha7";
}
