"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Sección desplegable (acordeón) con encabezado clicable. Abre y cierra con
 * una transición de altura real (grid 0fr ↔ 1fr), sin saltos. Cerrada queda
 * inerte: ni el foco ni el lector de pantalla entran al contenido oculto.
 */
export function CollapsibleCard({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  delay = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  /** Retraso de la animación de entrada (ms). */
  delay?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm motion-safe:animate-fade-in-up"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-brand-tint/60 sm:px-5 sm:py-4"
      >
        <span
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-dark transition-transform duration-300",
            open ? "rotate-90" : "rotate-0"
          )}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-brand-dark">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block max-w-[60ch] text-[13px] leading-snug text-slate-600">
              {subtitle}
            </span>
          )}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
      </button>
      <div
        id={panelId}
        ref={panelRef}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div
          className={clsx(
            "min-h-0 overflow-hidden transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
