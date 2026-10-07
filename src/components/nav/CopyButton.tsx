"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";

/** Copia un texto al portapapeles y lo confirma en el botón y con un aviso. */
export function CopyButton({
  text,
  label,
  copiedLabel = "Copiado",
  toastTitle = "Copiado al portapapeles",
  variant = "secondary",
  size = "md",
  className,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  toastTitle?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(toastTitle);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar", {
        description: "Seleccione el texto y cópielo a mano.",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={clsx(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "ghost" && "btn-ghost",
        size === "sm" && "btn-sm",
        className
      )}
    >
      {/* Las dos etiquetas comparten celda: el ancho no salta. */}
      <span className="grid items-center">
        <span
          className={clsx(
            "col-start-1 row-start-1 inline-flex items-center gap-2 transition-opacity duration-fast",
            copied && "opacity-0"
          )}
          aria-hidden={copied}
        >
          {label}
        </span>
        <span
          className={clsx(
            "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-opacity duration-fast",
            !copied && "opacity-0"
          )}
          aria-hidden={!copied}
        >
          <Icon name="check" className="h-4 w-4" />
          {copiedLabel}
        </span>
      </span>
    </button>
  );
}
