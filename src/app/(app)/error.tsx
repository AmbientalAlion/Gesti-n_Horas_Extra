"use client";

import Link from "next/link";

/**
 * Pantalla de error del área autenticada. Sin esto, cualquier validación de
 * negocio (p. ej. «La solicitud superaría el límite legal mensual de 48h»)
 * se mostraba como «Application error» en inglés y sin salida.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto max-w-lg space-y-4 text-center" role="alert">
      <h1 className="text-lg font-semibold text-brand-dark">
        No se pudo completar la acción
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        {error?.message ||
          "Ocurrió un problema inesperado. Intente de nuevo; si persiste, avise a Recursos Humanos."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button onClick={reset} className="btn-primary text-sm">
          Reintentar
        </button>
        <Link href="/dashboard" className="btn-secondary text-sm">
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
