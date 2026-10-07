"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { Spinner } from "@/components/ui/Spinner";

const VARIANT = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
} as const;

/**
 * Botón de envío que se bloquea y muestra un spinner mientras el formulario
 * viaja al servidor. Debe usarse DENTRO de un <form> (useFormStatus lee el
 * estado del padre).
 *
 *   <SubmitButton label="Guardar" pendingLabel="Guardando…" />
 *   <SubmitButton label="Ingresar" pendingLabel="Ingresando…" className="w-full" />
 *   <SubmitButton label="Descartar" variant="danger" size="sm" />
 *
 * Las dos etiquetas ocupan la misma celda de la rejilla: el ancho no salta
 * al cambiar de texto. Al pulsar, el botón se hunde 1px (.btn).
 */
export function SubmitButton({
  label,
  pendingLabel = "Guardando…",
  variant = "primary",
  size = "md",
  icon,
  disabled,
  className,
  name,
  value,
}: {
  label: string;
  pendingLabel?: string;
  variant?: keyof typeof VARIANT;
  size?: "md" | "sm";
  /** Icono opcional (p. ej. <Icon name="check" />) que se cambia por el spinner. */
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={clsx(VARIANT[variant], size === "sm" && "btn-sm", className)}
    >
      <span className="grid items-center justify-items-center">
        <span
          className={clsx(
            "inline-flex items-center gap-2 [grid-area:1/1] transition-opacity duration-fast",
            pending && "invisible opacity-0"
          )}
        >
          {icon}
          {label}
        </span>
        <span
          aria-hidden={!pending}
          className={clsx(
            "inline-flex items-center gap-2 [grid-area:1/1] transition-opacity duration-fast",
            !pending && "invisible opacity-0"
          )}
        >
          <Spinner />
          {pendingLabel}
        </span>
      </span>
    </button>
  );
}
