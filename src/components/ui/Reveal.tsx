"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Aparición al hacer scroll, para bloques que están bajo el pliegue.
 *
 *   <Reveal as="section" className="card">…</Reveal>
 *
 * - Lo que ya está en pantalla al montar NO se oculta ni se anima (para eso
 *   use la clase .reveal / .reveal-stagger).
 * - Sin JS, con movimiento reducido, al imprimir o si el navegador no tiene
 *   IntersectionObserver, el contenido se ve siempre.
 * - Un único observer compartido; cada bloque se anima una sola vez.
 */
type Tag = "div" | "section" | "article" | "li" | "ul" | "aside";

let observer: IntersectionObserver | null = null;
function getObserver() {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).dataset.reveal = "in";
          observer?.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  return observer;
}

export function Reveal({
  as: As = "div",
  className,
  children,
  ...rest
}: {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const io = getObserver();
    if (!io) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // ya visible
    el.dataset.reveal = "pending";
    io.observe(el);
    // Red de seguridad: nunca dejarlo oculto más de 4s.
    const t = window.setTimeout(() => {
      if (el.dataset.reveal === "pending") el.dataset.reveal = "in";
    }, 4000);
    const show = () => {
      if (el.dataset.reveal === "pending") el.dataset.reveal = "in";
    };
    window.addEventListener("beforeprint", show);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("beforeprint", show);
      io.unobserve(el);
      if (el.dataset.reveal === "pending") delete el.dataset.reveal;
    };
  }, []);

  return (
    <As ref={ref as React.Ref<never>} className={className} {...rest}>
      {children}
    </As>
  );
}
