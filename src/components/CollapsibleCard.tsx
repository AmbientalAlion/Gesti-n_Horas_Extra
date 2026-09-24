"use client";

import { useId, useState } from "react";
import clsx from "clsx";

/**
 * Sección desplegable (acordeón) con encabezado clicable. Sirve para ordenar
 * el panel en bloques que se abren o cierran, de modo que la página sea fácil
 * de recorrer. Accesible: botón con aria-expanded/aria-controls.
 */
export function CollapsibleCard({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-brand-tint/60 sm:px-5 sm:py-4"
      >
        <span
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-dark transition-transform",
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
        hidden={!open}
        className="border-t border-slate-100 px-4 py-4 sm:px-5 sm:py-5"
      >
        {children}
      </div>
    </section>
  );
}
