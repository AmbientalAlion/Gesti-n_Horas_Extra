"use client";

import { useEffect, useState } from "react";

/**
 * Movimiento reducido.
 *
 * - `prefersReducedMotion()`: lectura puntual (fuera de React o en handlers).
 *   Devuelve `true` en el servidor, así nada anima antes de saberlo.
 * - `useReducedMotion()`: hook reactivo; se actualiza si el usuario cambia la
 *   preferencia del sistema. En SSR e hidratación vale `false` y se corrige
 *   en el primer efecto.
 *
 * Regla: todo `Element.animate()`, contador con requestAnimationFrame o
 * `document.startViewTransition()` lo consulta y, si es `true`, pinta el
 * estado final (o un fundido corto) en lugar de mover cosas.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}
