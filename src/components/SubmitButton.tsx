"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";

/**
 * Botón de envío que se bloquea y cambia de texto mientras el formulario viaja
 * al servidor. Sin esto el usuario pulsa «Guardar» y no ve ninguna reacción.
 * Debe usarse DENTRO de un <form> (useFormStatus lee el estado del padre).
 */
export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  disabled,
  className,
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={clsx(
        variant === "primary" ? "btn-primary" : "btn-secondary",
        "text-sm",
        className
      )}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
