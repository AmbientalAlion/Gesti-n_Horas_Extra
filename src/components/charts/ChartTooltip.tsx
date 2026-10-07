"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { prefersReducedMotion } from "../ui/useReducedMotion";

/**
 * Tooltip compartido de los gráficos (sustituye a <title>, que tarda ~1 s,
 * no funciona con teclado ni al tocar y no admite formato).
 *
 *   const tip = useChartTooltip();
 *   <g tabIndex={0} {...tip.bind("k", { title: "8–14 jun", lines: ["8,0h"] })} />
 *   {tip.node}
 *
 * - Ratón: aparece a los 80 ms y sigue al puntero (12 px por encima).
 * - Teclado (:focus-visible): se ancla encima del elemento enfocado.
 * - Toque: solo si `touch: true` (en elementos sin acción propia); si el
 *   toque abre el panel, no hay tooltip.
 * - Esc lo cierra sin cerrar el panel lateral. Desplazar la página también.
 * - role="tooltip" con aria-describedby en el elemento activo (opcional con
 *   `describe: false` cuando el elemento ya tiene ese texto visible).
 * - Se dibuja en un portal con position: fixed, así no lo recortan los
 *   contenedores con overflow (tabla del mapa de calor, panel lateral).
 */
export interface TipContent {
  title: string;
  lines?: string[];
  /** Tono de la marca lateral (estado). */
  tone?: "default" | "ok" | "risk" | "over" | "pending";
}

interface TipState {
  key: string;
  content: TipContent;
  x: number;
  y: number;
  /** Anclado a un elemento (foco o toque) en lugar de al puntero. */
  anchored: boolean;
}

const TONE_BAR: Record<NonNullable<TipContent["tone"]>, string> = {
  default: "bg-chart-1",
  ok: "bg-ok-solid",
  risk: "bg-risk-solid",
  over: "bg-over-solid",
  pending: "bg-pending-solid",
};

export function useChartTooltip() {
  const id = useId();
  const [tip, setTip] = useState<TipState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const raf = useRef(0);
  const tipRef = useRef<TipState | null>(null);
  tipRef.current = tip;

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    cancelAnimationFrame(raf.current);
    setTip(null);
  }, []);

  // Desplazar o cambiar el tamaño: el tooltip fijo se quedaría suelto.
  useEffect(() => {
    if (!tip) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [tip, hide]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
    },
    []
  );

  const anchorTo = (el: Element, key: string, content: TipContent) => {
    const r = el.getBoundingClientRect();
    window.clearTimeout(timer.current);
    setTip({ key, content, x: r.left + r.width / 2, y: r.top, anchored: true });
  };

  const bind = (
    key: string,
    content: TipContent,
    opts: { touch?: boolean; describe?: boolean } = {}
  ) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      const { clientX, clientY } = e;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => setTip({ key, content, x: clientX, y: clientY, anchored: false }),
        tipRef.current ? 0 : 80
      );
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      const cur = tipRef.current;
      const { clientX, clientY } = e;
      if (!cur || cur.key !== key || cur.anchored) return;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() =>
        setTip((p) => (p && p.key === key ? { ...p, x: clientX, y: clientY } : p))
      );
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      hide();
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || !opts.touch) return;
      const el = e.currentTarget;
      if (tipRef.current?.key === key) hide();
      else anchorTo(el, key, content);
    },
    onFocus: (e: React.FocusEvent) => {
      const el = e.currentTarget;
      let keyboard = true;
      try {
        keyboard = el.matches(":focus-visible");
      } catch {
        /* navegador sin :focus-visible */
      }
      if (keyboard) anchorTo(el, key, content);
    },
    onBlur: () => {
      if (tipRef.current?.key === key) hide();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && tipRef.current) {
        e.stopPropagation();
        hide();
      }
    },
    "aria-describedby": opts.describe !== false && tip?.key === key ? id : undefined,
  });

  const node = <TooltipPortal id={id} tip={tip} />;
  return { bind, node, hide, activeKey: tip?.key ?? null };
}

function TooltipPortal({ id, tip }: { id: string; tip: TipState | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !tip) return null;
  return createPortal(<TooltipBox id={id} tip={tip} />, document.body);
}

function TooltipBox({ id, tip }: { id: string; tip: TipState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const shownKey = useRef<string | null>(null);

  // Coloca la caja: encima del punto, dentro de la ventana (8 px de margen).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const gap = tip.anchored ? 10 : 14;
    let left = tip.x - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = tip.y - h - gap;
    let below = false;
    if (top < 8) {
      top = tip.y + (tip.anchored ? 34 : 22);
      below = true;
    }
    setPos({ left, top, below });
  }, [tip.x, tip.y, tip.anchored, tip.key]);

  // Entrada corta (120 ms) solo al aparecer, no al seguir el puntero.
  useEffect(() => {
    const el = ref.current;
    if (!el || !pos || shownKey.current === tip.key) return;
    const first = shownKey.current === null;
    shownKey.current = tip.key;
    if (!first || typeof el.animate !== "function") return;
    const reduced = prefersReducedMotion();
    el.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateY(${pos.below ? -2 : 2}px)` },
            { opacity: 1, transform: "none" },
          ],
      { duration: reduced ? 100 : 120, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }, [pos, tip.key]);

  const { content } = tip;
  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className={clsx(
        "pointer-events-none fixed z-[60] max-w-[min(18rem,calc(100vw-16px))] overflow-hidden rounded-control bg-ink/95 py-2 pl-3.5 pr-3 text-caption text-surface shadow-3 print:hidden"
      )}
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <span
        className={clsx("absolute inset-y-0 left-0 w-1", TONE_BAR[content.tone ?? "default"])}
        aria-hidden
      />
      <span className="block font-bold leading-4">{content.title}</span>
      {content.lines?.map((l, i) => (
        <span key={i} className="mt-0.5 block font-medium tabular-nums leading-4 opacity-90">
          {l}
        </span>
      ))}
    </div>
  );
}
