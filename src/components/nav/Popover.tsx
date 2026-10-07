"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Panel desplegable (patrón «disclosure»): botón con aria-expanded que abre
 * una tarjeta debajo. Se cierra con Escape (el foco vuelve al botón), con un
 * toque fuera o al elegir un enlace o botón dentro. Entra con scale-in
 * (220ms, desde la esquina del botón); no se monta mientras está cerrado,
 * así que nunca queda un panel invisible encima del contenido.
 */
export function Popover({
  button,
  buttonClassName,
  buttonLabel,
  title,
  align = "right",
  className,
  onOpenChange,
  children,
}: {
  button: React.ReactNode;
  buttonClassName?: string;
  /** Nombre accesible cuando el botón es solo icono. */
  buttonLabel?: string;
  /** Encabezado visible del panel (también le da nombre a la región). */
  title?: string;
  align?: "left" | "right";
  className?: string;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  const onChange = useRef(onOpenChange);
  onChange.current = onOpenChange;
  useEffect(() => onChange.current?.(open), [open]);

  useEffect(() => {
    if (!open) return;
    // Primer elemento enfocable del panel.
    panel.current
      ?.querySelector<HTMLElement>("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])")
      ?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onFocus = (e: FocusEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={buttonLabel}
        title={buttonLabel}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        {button}
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          role="region"
          aria-label={title ?? buttonLabel}
          onClick={(e) => {
            const t = (e.target as Element).closest("a[href],button[type='submit'],[data-close]");
            if (t) setOpen(false);
          }}
          className={clsx(
            "absolute top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-scale-in rounded-card border border-line bg-surface p-2 shadow-3",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
            className
          )}
        >
          {title && (
            <p className="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-[0.02em] text-muted">
              {title}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

/** Fila de acción dentro del Popover (enlace o botón): 44px, icono + texto. */
export const POPOVER_ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-ui text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink";
