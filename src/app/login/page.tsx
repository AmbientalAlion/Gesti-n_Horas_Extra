import Link from "next/link";
import { login } from "./actions";
import { isSupabaseConfigured } from "@/lib/demo";
import { BrandMark, Claim } from "@/components/brand/BrandMark";
import { Triangulo, Circulo, Linea } from "@/components/brand/Figures";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const configured = isSupabaseConfigured();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4">
      {/* Composición de marca: figuras geométricas, azul sobre blanco, sin tocarse. */}
      <Triangulo
        className="absolute h-40 w-40 opacity-10"
        style={{ top: "-2rem", left: "-2rem", transform: "rotate(15deg)" }}
      />
      <Circulo
        className="absolute h-28 w-28 opacity-10"
        style={{ bottom: "3rem", left: "8%" }}
      />
      <Linea
        className="absolute h-14 w-56 opacity-10"
        color="#00CBBF"
        style={{ top: "18%", right: "6%" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size="lg" />
          <p className="mt-3 text-sm text-muted">Control de Horas Extras</p>
          <Claim className="mt-1 text-xs" />
        </div>

        {!configured ? (
          <div className="card space-y-4 text-center">
            <p className="text-sm text-ink-2">
              La autenticación requiere configurar Supabase. Explore la
              aplicación en <strong>modo demostración</strong>.
            </p>
            <Link href="/demo/dashboard" className="btn-primary w-full">
              Explorar el demo
            </Link>
          </div>
        ) : (
          <>
            <form action={login} className="card space-y-4">
              {searchParams.error && (
                <p className="rounded-lg bg-over-soft px-3 py-2 text-sm text-over">
                  {searchParams.error === "credenciales"
                    ? "Usuario o contraseña incorrectos."
                    : "No se pudo iniciar sesión. Inténtelo de nuevo."}
                </p>
              )}
              <label className="block text-sm">
                <span className="mb-1 block text-ink-2">Correo o usuario</span>
                <input
                  name="email"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className="w-full rounded-lg border border-line-strong px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-2">Contraseña</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-line-strong px-3 py-2"
                />
              </label>
              <button type="submit" className="btn-primary w-full">
                Iniciar sesión
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/demo/dashboard"
                className="text-sm font-medium text-link hover:text-heading"
              >
                ¿Solo mirar? Explorar el demo →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
