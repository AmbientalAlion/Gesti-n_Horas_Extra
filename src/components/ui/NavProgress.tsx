"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Barra de progreso superior (3px) mientras se navega.
 *
 * Montada en src/app/layout.tsx dentro de <Suspense> (usa useSearchParams).
 * - Arranca sola al hacer clic en un enlace interno (mismo origen, sin
 *   target, sin teclas modificadoras, distinto de la URL actual).
 * - Para navegaciones por código (router.push en filtros, mes, «Ver como»),
 *   llame a `startNavProgress()` justo antes del push.
 * - Termina cuando cambian pathname o searchParams (o a los 12s).
 * - Solo se ve si la espera supera 120ms. Con movimiento reducido no avanza
 *   poco a poco: aparece completa y se apaga al terminar.
 * Es decorativa (aria-hidden): el anuncio lo hace el esqueleto (role=status).
 */
const START = "nav-progress:start";

export function startNavProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START));
}

function isModified(e: MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const bar = useRef<HTMLDivElement>(null);
  const state = useRef<{ active: boolean; show?: number; safety?: number; anim?: Animation }>({
    active: false,
  });

  // Inicio.
  useEffect(() => {
    const start = () => {
      const s = state.current;
      const el = bar.current;
      if (!el || s.active) return;
      s.active = true;
      window.clearTimeout(s.show);
      window.clearTimeout(s.safety);
      s.show = window.setTimeout(() => {
        if (!s.active || !el) return;
        s.anim?.cancel();
        el.style.opacity = "1";
        if (prefersReducedMotion() || typeof el.animate !== "function") {
          el.style.transform = "scaleX(1)";
          el.style.opacity = "0.8";
          return;
        }
        s.anim = el.animate(
          [
            { transform: "scaleX(0)" },
            { transform: "scaleX(0.3)", offset: 0.025 },
            { transform: "scaleX(0.85)" },
          ],
          { duration: 8000, easing: "cubic-bezier(0.1, 0.7, 0.2, 1)", fill: "forwards" }
        );
      }, 120);
      s.safety = window.setTimeout(() => finish(), 12000);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || isModified(e)) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download") || a.getAttribute("rel")?.includes("external")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/api/")) return;
      const here = window.location;
      if (url.pathname === here.pathname && url.search === here.search) return; // misma página o ancla
      start();
    };

    window.addEventListener(START, start);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(START, start);
      document.removeEventListener("click", onClick, true);
    };
    // finish es estable (solo usa refs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    const s = state.current;
    const el = bar.current;
    window.clearTimeout(s.show);
    window.clearTimeout(s.safety);
    if (!s.active || !el) return;
    s.active = false;
    const shown = el.style.opacity !== "" && el.style.opacity !== "0";
    if (!shown) {
      s.anim?.cancel();
      return;
    }
    const reduce = prefersReducedMotion() || typeof el.animate !== "function";
    if (reduce) {
      s.anim?.cancel();
      el.style.opacity = "0";
      el.style.transform = "scaleX(0)";
      return;
    }
    const current = getComputedStyle(el).transform;
    s.anim?.cancel();
    const done = el.animate(
      [
        { transform: current === "none" ? "scaleX(0)" : current, opacity: 1 },
        { transform: "scaleX(1)", opacity: 1, offset: 0.45 },
        { transform: "scaleX(1)", opacity: 0 },
      ],
      { duration: 360, easing: "ease-out" }
    );
    el.style.opacity = "0";
    el.style.transform = "scaleX(0)";
    s.anim = done;
  };

  // Fin: cambió la URL.
  const key = `${pathname}?${search?.toString() ?? ""}`;
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] print:hidden"
    >
      <div
        ref={bar}
        className="h-full origin-left bg-gradient-to-r from-brand to-brand-300 shadow-[0_0_8px_rgb(0_152_186/0.45)] dark:from-brand-300 dark:to-brand-200"
        style={{ opacity: 0, transform: "scaleX(0)" }}
      />
    </div>
  );
}
