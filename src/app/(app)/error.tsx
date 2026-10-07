"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatusScreen } from "@/components/nav/StatusScreen";
import { CopyButton } from "@/components/nav/CopyButton";
import { Icon } from "@/components/ui/Icon";

/**
 * Pantalla de error del área autenticada, dentro del layout (el menú sigue
 * disponible).
 *
 * En producción, Next reemplaza el mensaje de los errores de servidor por un
 * texto genérico en inglés y añade `digest`. Por eso, con digest se muestra
 * un texto fijo y el código de soporte (con botón para copiarlo); sin
 * digest, el mensaje propio (p. ej. una validación de negocio en español).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const own =
    !error?.digest && error?.message && !/^An error occurred/i.test(error.message)
      ? error.message
      : null;

  return (
    <StatusScreen
      tone="error"
      icon="alert"
      role="alert"
      title={own ? "No se pudo completar la acción" : "Algo falló al cargar esta sección"}
      actions={
        <>
          <Link href="/dashboard" className="btn-secondary">
            <Icon name="arrow-left" className="h-4 w-4" />
            Volver al panel
          </Link>
          <button type="button" onClick={reset} className="btn-primary">
            Reintentar
          </button>
        </>
      }
      footer={
        error?.digest ? (
          <span className="inline-flex flex-wrap items-center justify-center gap-2">
            <span>
              Código de soporte:{" "}
              <code className="rounded-chip bg-surface-3 px-1.5 py-0.5 font-mono text-caption text-ink-2">
                {error.digest}
              </code>
            </span>
            <CopyButton
              text={error.digest}
              label="Copiar código"
              toastTitle="Código de soporte copiado"
              variant="ghost"
              size="sm"
            />
          </span>
        ) : null
      }
    >
      <p>
        {own ??
          "Puede ser un corte momentáneo de la conexión. Intente de nuevo; si el problema sigue, avise a Recursos Humanos con el código de soporte."}
      </p>
    </StatusScreen>
  );
}
