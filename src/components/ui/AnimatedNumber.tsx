"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Cifra que cuenta hasta su valor (600ms, easeOut) con requestAnimationFrame.
 *
 *   <AnimatedNumber value={12} />                        // «12»
 *   <AnimatedNumber value={38.5} decimals={1} suffix="h" /> // «38,5h»
 *   <AnimatedNumber value={v} format={fmtH} />           // formato propio
 *
 * - Al montar cuenta desde 0; si `value` cambia, cuenta desde el valor anterior.
 * - El HTML del servidor ya trae el valor final (sin JS se ve correcto).
 * - Con movimiento reducido no anima: pinta el valor final.
 * - Formato por defecto es-CO (coma decimal). Los lectores de pantalla leen
 *   solo el valor final (texto sr-only); la parte animada es aria-hidden.
 */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const formatters = new Map<number, Intl.NumberFormat>();
function defaultFormat(n: number, decimals: number): string {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, f);
  }
  return f.format(n);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  format,
  duration = 600,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  /** Sustituye el formato por defecto (se ignoran decimals/prefix/suffix). */
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  /** Valor que se ve ahora mismo (0 antes de la primera animación). */
  const shown = useRef(0);
  const render = (n: number) =>
    format ? format(n) : `${prefix}${defaultFormat(n, decimals)}${suffix}`;
  const finalText = render(value);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Se escribe en el nodo de texto que React ya creó, sin reemplazarlo.
    const setText = (s: string) => {
      const node = el.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = s;
      else el.textContent = s;
    };
    const start = shown.current;
    if (start === value || prefersReducedMotion() || !Number.isFinite(value)) {
      shown.current = value;
      setText(finalText);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const n = start + (value - start) * easeOut(t);
      shown.current = t >= 1 ? value : n;
      setText(t >= 1 ? finalText : render(n));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    setText(render(start));
    raf = requestAnimationFrame(step);
    // Al cancelar (cambio de valor o desmontaje) se sigue desde lo mostrado.
    return () => cancelAnimationFrame(raf);
    // render/finalText dependen de value y del formato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, finalText, duration]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden className="tabular-nums">
        {finalText}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}
