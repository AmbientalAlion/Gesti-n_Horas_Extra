import Link from "next/link";
import { login } from "./actions";
import { isSupabaseConfigured } from "@/lib/demo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-brand">ALION</div>
          <p className="text-sm text-slate-500">Control de Horas Extras</p>
        </div>

        {!configured ? (
          <div className="card space-y-4 text-center">
            <p className="text-sm text-slate-600">
              La autenticación requiere configurar Supabase. Actualmente la
              aplicación funciona en <strong>modo demostración</strong>.
            </p>
            <Link href="/dashboard" className="btn-primary w-full">
              Entrar al dashboard (demo)
            </Link>
          </div>
        ) : (
          <form action={login} className="card space-y-4">
            {searchParams.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {searchParams.error}
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Correo</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Contraseña</span>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button type="submit" className="btn-primary w-full">
              Iniciar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
