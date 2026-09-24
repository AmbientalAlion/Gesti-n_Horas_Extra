"use client";

import { useEffect, useId, useRef } from "react";
import clsx from "clsx";

/**
 * Panel lateral que entra desde la derecha. Queda montado siempre para poder
 * animar tanto la entrada como la salida. Accesible: role="dialog", Esc y clic
 * en el fondo lo cierran, el foco queda atrapado dentro mientras está abierto
 * y vuelve al elemento que lo abrió al cerrarse.
 */
export function SlideOver({
  open,
  onClose,
  onBack,
  title,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  /** Si existe, muestra «← Volver» (navegación dentro del panel). */
  onBack?: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Cerrado = inerte (ni foco ni lector de pantalla entran al panel oculto).
  useEffect(() => {
    rootRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  // Foco, bloqueo de scroll y teclado.
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div
      ref={rootRef}
      className={clsx("fixed inset-0 z-50 print:hidden", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Fondo */}
      <div
        onClick={onClose}
        className={clsx(
          "absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:max-w-lg",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-start gap-2 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-medium text-brand-dark hover:bg-brand-tint"
            >
              ← Volver
            </button>
          )}
          <div className="min-w-0 flex-1 pt-1">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                {eyebrow}
              </p>
            )}
            <h2 id={titleId} className="truncate text-lg font-bold text-brand-dark">
              {title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
