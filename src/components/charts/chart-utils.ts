"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SemaphoreLevel } from "@/lib/types";
import { prefersReducedMotion } from "../ui/useReducedMotion";

// Utilidades compartidas por los gráficos (solo interfaz; no hay lógica de
// negocio aquí).

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** «38,5» (coma decimal, como fmtH). */
export const fmt = (n: number, decimals = 1) => n.toFixed(decimals).replace(".", ",");

/** Id seguro para url(#…) a partir de useId (quita los «:»). */
export const svgId = (id: string, suffix: string) => `${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${suffix}`;

/** Ancho aproximado de un texto (Mulish) para no recortar etiquetas. */
export const textWidth = (s: string, px = 12) => s.length * px * 0.56;

/**
 * Mide el contenedor del gráfico con ResizeObserver para dibujar el SVG con
 * viewBox = tamaño real en px: 1 unidad = 1 px y el texto no escala.
 * Antes de medir (SSR) usa `fallback`.
 */
export function useChartSize<T extends HTMLElement>(fallback: { width: number; height: number }) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ ...fallback, measured: false });

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const width = Math.round(r.width);
      const height = Math.round(r.height);
      if (width <= 0 || height <= 0) return;
      setSize((p) =>
        p.measured && p.width === width && p.height === height ? p : { width, height, measured: true }
      );
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(read);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return [ref, size] as const;
}

/**
 * Animación de entrada de un gráfico, con Web Animations.
 *
 * - `build(root)` crea las animaciones (Element.animate) y las devuelve.
 *   Deben usar fill «backwards» o ninguno: al terminar, el elemento queda
 *   con su estilo propio, que es el estado final ya pintado por el servidor.
 * - Si el gráfico está a la vista, arranca ya. Si está bajo el pliegue,
 *   las animaciones esperan en pausa (en su primer fotograma) hasta que
 *   entra en pantalla, con red de seguridad de 4 s y al imprimir.
 * - Sin JS, sin WAAPI o con movimiento reducido: no se anima nada y se ve
 *   el estado final.
 * - Solo una vez por montaje, cuando `ready` es true (p. ej., tras medir).
 */
export function useChartEntrance(
  ref: React.RefObject<Element>,
  build: (root: Element) => Animation[],
  ready = true
) {
  const done = useRef(false);
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    const root = ref.current;
    if (!ready || done.current || !root) return;
    done.current = true;
    if (prefersReducedMotion() || typeof root.animate !== "function") return;

    let anims: Animation[] = [];
    try {
      anims = buildRef.current(root);
    } catch {
      return;
    }
    if (anims.length === 0) return;

    const finishAll = () => {
      for (const a of anims) {
        try {
          a.finish();
        } catch {
          a.cancel();
        }
      }
    };
    const r = root.getBoundingClientRect();
    const visible = r.top < window.innerHeight && r.bottom > 0;
    if (visible || typeof IntersectionObserver === "undefined") {
      return () => anims.forEach((a) => a.cancel());
    }

    for (const a of anims) a.pause();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          for (const a of anims) a.play();
          io.disconnect();
          window.clearTimeout(safety);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(root);
    const safety = window.setTimeout(() => {
      io.disconnect();
      finishAll();
    }, 4000);
    window.addEventListener("beforeprint", finishAll);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
      window.removeEventListener("beforeprint", finishAll);
      anims.forEach((a) => a.cancel());
    };
  }, [ref, ready]);
}

/** Curvas de movimiento (iguales a las variables CSS --ease-*). */
export const EASE = {
  enter: "cubic-bezier(0.22, 1, 0.36, 1)",
  move: "cubic-bezier(0.65, 0, 0.35, 1)",
  pop: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Retraso escalonado con tope de 150 ms (nunca retrasa más el contenido). */
export const stagger = (i: number, step = 30) => Math.min(i * step, 150);

/** Clase de relleno SVG del estado (tokens: funcionan en oscuro e impresión). */
export const LEVEL_FILL: Record<SemaphoreLevel, string> = {
  green: "fill-chart-1",
  yellow: "fill-risk-solid",
  red: "fill-over-solid",
};

/**
 * Trazo de la forma del estado centrada en (cx, cy): círculo (Normal o
 * dentro de la meta), triángulo (En riesgo) y rombo (Excedido). Misma
 * gramática que LevelIcon.
 */
export function markerPath(level: SemaphoreLevel, cx: number, cy: number, r = 5): string {
  if (level === "red") {
    const d = r * 1.3;
    return `M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`;
  }
  if (level === "yellow") {
    const s = r * 1.35;
    return `M${cx} ${cy - s}L${cx + s * 1.05} ${cy + s * 0.75}L${cx - s * 1.05} ${cy + s * 0.75}Z`;
  }
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
}

/** Estilo de halo para texto sobre líneas (se lee aunque se crucen). */
export const HALO: React.CSSProperties = {
  paintOrder: "stroke",
  stroke: "rgb(var(--c-surface))",
  strokeWidth: 3,
  strokeLinejoin: "round",
};
