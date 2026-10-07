"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

/**
 * Bloque que se despliega con su altura real (grid 0fr ↔ 1fr).
 * Abre en 320ms (--ease-enter) y el contenido se funde y baja 4px con 60ms de
 * retraso; cierra con --ease-exit. Plegado queda inerte (sin foco ni lector).
 * Con movimiento reducido las distancias valen 0 y queda un fundido corto.
 */
export function Collapse({
  open,
  children,
  className,
  id,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !open);
  }, [open]);
  return (
    <div
      id={id}
      className={clsx(
        "grid transition-[grid-template-rows] duration-slow",
        open ? "grid-rows-[1fr] ease-enter" : "grid-rows-[0fr] ease-exit",
        className
      )}
    >
      {/* -mx-1/px-1: deja sitio al anillo de foco de los campos internos. */}
      <div ref={ref} aria-hidden={!open || undefined} className="-mx-1 min-h-0 overflow-hidden px-1">
        <div
          className={clsx(
            "py-1 transition-[opacity,transform] ease-enter",
            open
              ? "translate-y-0 opacity-100 delay-[60ms] duration-base"
              : "-translate-y-[var(--dist-sm)] opacity-0 duration-fast"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
