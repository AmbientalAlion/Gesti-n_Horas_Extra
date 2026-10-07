"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { StatusBadge } from "../StatusBadge";
import { BackLink } from "./BackLink";
import type { SemaphoreLevel } from "@/lib/types";

/**
 * Barra compacta de la ficha: aparece arriba cuando la cabecera sale de la
 * pantalla, con «Volver», el nombre, el estado y la cifra clave. Entra en
 * 200ms desde arriba (con movimiento reducido, solo fundido). Sin JS no se
 * muestra (la cabecera completa sigue en su sitio).
 */
export function FichaStickyBar({
  targetId,
  name,
  initials,
  level,
  pending,
  summary,
  backHref,
}: {
  /** id de la cabecera que se observa. */
  targetId: string;
  name: string;
  initials: string;
  level: SemaphoreLevel;
  pending: number;
  /** p. ej. «38,0h · meta 36,0h». */
  summary: string;
  backHref: string;
}) {
  const [show, setShow] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  useEffect(() => {
    barRef.current?.toggleAttribute("inert", !show);
  }, [show]);

  return (
    <div className="sticky top-0 z-30 h-0 print:hidden">
      <div
        ref={barRef}
        aria-hidden={!show}
        className={clsx(
          "absolute inset-x-0 top-2 flex h-14 items-center gap-2 rounded-card border border-line bg-surface/90 px-2 pr-3 shadow-2 backdrop-blur-md sm:gap-3",
          "transition-[transform,opacity] duration-200 ease-enter motion-reduce:transition-opacity",
          show
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-[calc(100%+0.5rem)] opacity-0 motion-reduce:translate-y-0"
        )}
      >
        <BackLink href={backHref} compact />
        <span
          aria-hidden
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-caption font-bold text-heading sm:inline-flex"
        >
          {initials}
        </span>
        <p className="min-w-0 flex-1 truncate text-ui font-semibold text-heading">{name}</p>
        <StatusBadge level={level} pending={pending} size="sm" className="hidden shrink-0 min-[420px]:inline-flex" />
        <p className="hidden shrink-0 text-small tabular-nums text-ink-2 md:block">{summary}</p>
      </div>
    </div>
  );
}
