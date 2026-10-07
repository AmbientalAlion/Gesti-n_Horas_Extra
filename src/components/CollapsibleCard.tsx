"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "./ui/Icon";
import { Reveal } from "./ui/Reveal";

/**
 * Sección desplegable (acordeón) con encabezado clicable.
 *
 * - Altura real con grid 0fr ↔ 1fr: abre en 280ms (--ease-enter) y cierra en
 *   220ms (--ease-exit). El contenido se funde y sube 4px con 60ms de retraso
 *   al abrir; al cerrar se desvanece primero (120ms).
 * - El chevron gira 180° en 240ms (--ease-move).
 * - Cerrada queda inerte: ni el foco ni el lector de pantalla entran.
 * - `lazy`: no monta el contenido hasta la primera apertura (menos trabajo
 *   de hidratación en lo plegado); al imprimir se monta y se muestra todo.
 * - Bajo el pliegue entra con <Reveal> (sin ocultar lo ya visible).
 */
export function CollapsibleCard({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  lazy = false,
  id,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  lazy?: boolean;
  /** id de la sección (anclas). */
  id?: string;
  className?: string;
  /** Obsoleto: la entrada la gestiona <Reveal>. */
  delay?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(defaultOpen || !lazy);
  const panelId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  // Al imprimir, todo el contenido debe existir (aunque esté plegado).
  useEffect(() => {
    if (mounted) return;
    const onPrint = () => setMounted(true);
    window.addEventListener("beforeprint", onPrint);
    return () => window.removeEventListener("beforeprint", onPrint);
  }, [mounted]);

  const toggle = () => {
    if (!open) setMounted(true);
    setOpen((o) => !o);
  };

  return (
    <Reveal
      as="section"
      id={id}
      aria-labelledby={titleId}
      className={clsx("card overflow-hidden p-0 sm:p-0", className)}
    >
      <h2 className="m-0">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex min-h-14 w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-fast hover:bg-surface-2 active:bg-surface-3 sm:px-5 sm:py-4"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-heading transition-colors duration-fast group-hover:bg-surface-3 print:hidden"
            aria-hidden="true"
          >
            <Icon
              name="chevron-down"
              className={clsx(
                "h-4 w-4 transition-transform duration-[240ms] ease-move",
                open ? "rotate-0" : "-rotate-90"
              )}
              strokeWidth={2.25}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span id={titleId} className="block text-title text-heading">
              {title}
            </span>
            {subtitle && (
              <span className="mt-0.5 block max-w-[65ch] text-small font-normal text-ink-2">
                {subtitle}
              </span>
            )}
          </span>
          {badge && <span className="shrink-0">{badge}</span>}
        </button>
      </h2>
      <div
        id={panelId}
        ref={panelRef}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows] print:grid-rows-[1fr]",
          open
            ? "grid-rows-[1fr] duration-[280ms] ease-enter"
            : "grid-rows-[0fr] delay-[40ms] duration-[220ms] ease-exit"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={clsx(
              "border-t border-line px-4 py-4 transition-[opacity,transform] print:translate-y-0 print:opacity-100 sm:px-5 sm:py-5",
              open
                ? "translate-y-0 opacity-100 delay-[60ms] duration-[200ms] ease-enter"
                : "-translate-y-1 opacity-0 duration-[120ms] ease-exit"
            )}
          >
            {mounted ? children : null}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
