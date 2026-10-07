"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Icon } from "../ui/Icon";
import { prefersReducedMotion, useReducedMotion } from "../ui/useReducedMotion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Panel de detalle. Desde 640px entra desde la derecha; en el teléfono es una
 * hoja inferior con asa que se cierra arrastrando hacia abajo.
 *
 * - Siempre montado (en un portal sobre <body>) para animar entrada y salida:
 *   entra en 260ms (--ease-enter) y sale en 200ms (--ease-exit); el fondo se
 *   funde a la vez. Con movimiento reducido: solo fundido de 150ms.
 * - Navegación interna: el contenido entra desplazado 24px hacia la
 *   dirección del movimiento (avanzar / volver) con Web Animations.
 * - Accesible: role="dialog" + aria-modal, la app de fondo queda inert, Esc
 *   cierra, el foco queda atrapado y se gestiona en cada paso (al abrir y al
 *   navegar va al título; al volver, al control que abrió esa vista; al
 *   cerrar, al elemento que abrió el panel).
 */

export type DrawerDirection = "open" | "push" | "back" | "next" | "prev";

export interface DrawerPager {
  /** Posición (desde 0) y total de la lista de la que se abrió la persona. */
  index: number;
  total: number;
  prevLabel?: string;
  nextLabel?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

const SHEET_QUERY = "(max-width: 639.98px)";
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
}

function focusable(el: HTMLElement | null | undefined): el is HTMLElement {
  return !!el && el.isConnected && el !== document.body && el.getClientRects().length > 0;
}

export function SlideOver({
  open,
  onClose,
  onBack,
  backLabel,
  title,
  eyebrow,
  children,
  footer,
  viewKey,
  direction = "open",
  focusKey,
  getOpener,
  getFallbackFocus,
  pager,
}: {
  open: boolean;
  onClose: () => void;
  /** Si existe, muestra «Volver» (navegación dentro del panel). */
  onBack?: () => void;
  /** Destino de «Volver», p. ej. «En riesgo (2)». */
  backLabel?: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Identifica la vista actual: al cambiar se anima y se mueve el foco. */
  viewKey: string;
  direction?: DrawerDirection;
  /** data-drawer-key del control que debe recibir el foco tras volver. */
  focusKey?: string | null;
  /** Elemento que abrió el panel (recibe el foco al cerrar). */
  getOpener?: () => HTMLElement | null;
  /** Respaldo si el que abrió ya no está (p. ej. la fila de la persona). */
  getFallbackFocus?: () => HTMLElement | null;
  pager?: DrawerPager | null;
}) {
  const [mounted, setMounted] = useState(false);
  // «shown»: sigue visible mientras dura la animación de salida.
  const [shown, setShown] = useState(false);
  const reduced = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const scrollMap = useRef(new Map<string, number>());
  const viewKeyRef = useRef(viewKey);
  const lastView = useRef<string | null>(null);
  const titleId = useId();

  // Refs a las props que se leen dentro de efectos de larga vida.
  const latest = useRef({ onClose, pager, getOpener, getFallbackFocus });
  latest.current = { onClose, pager, getOpener, getFallbackFocus };

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setShown(true);
      return;
    }
    const t = window.setTimeout(() => setShown(false), 240);
    return () => window.clearTimeout(t);
  }, [open]);

  // Cerrado = inerte (ni foco ni lector de pantalla entran al panel oculto).
  useEffect(() => {
    rootRef.current?.toggleAttribute("inert", !open);
  }, [open, mounted]);

  // Al abrir: foco, bloqueo de scroll, fondo inerte y teclado.
  useEffect(() => {
    if (!open || !mounted) return;
    const active = document.activeElement as HTMLElement | null;
    const opener = latest.current.getOpener?.() ?? null;
    returnFocus.current = focusable(opener) ? opener : focusable(active) ? active : opener;

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    // La app de fondo queda inerte (el Toaster y este portal siguen activos).
    const shell = document.getElementById("contenido")?.closest<HTMLElement>("body > *") ?? null;
    const setInert = shell && !shell.hasAttribute("inert");
    if (setInert) shell.setAttribute("inert", "");

    const raf = requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        e.preventDefault();
        latest.current.onClose();
        return;
      }
      const pg = latest.current.pager;
      if (
        pg &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey &&
        !isTypingTarget(e.target)
      ) {
        const go = e.key === "ArrowLeft" ? pg.onPrev : pg.onNext;
        if (go) {
          e.preventDefault();
          go();
        }
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.getClientRects().length > 0
      );
      if (f.length === 0) {
        e.preventDefault();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const inside = panelRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside || document.activeElement === titleRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      if (setInert) shell.removeAttribute("inert");
      // Devolver el foco a quien abrió el panel (o a la fila de la persona).
      const target = focusable(returnFocus.current)
        ? returnFocus.current
        : latest.current.getFallbackFocus?.() ?? null;
      returnFocus.current = null;
      if (target && target.isConnected) target.focus({ preventScroll: false });
    };
  }, [open, mounted]);

  // Cambio de vista dentro del panel: animación direccional, scroll y foco.
  useIsoLayoutEffect(() => {
    const prev = lastView.current;
    lastView.current = open ? viewKey : null;
    viewKeyRef.current = viewKey;
    if (!open || prev === null || prev === viewKey) return;

    const body = bodyRef.current;
    const backwards = direction === "back" || direction === "prev";
    if (body) body.scrollTop = direction === "back" ? scrollMap.current.get(viewKey) ?? 0 : 0;

    const rm = prefersReducedMotion();
    const dx = backwards ? -24 : 24;
    try {
      contentRef.current?.animate(
        rm
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: `translateX(${dx}px)` },
              { opacity: 1, transform: "none" },
            ],
        { duration: rm ? 150 : 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }
      );
      titleRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 160,
        easing: "linear",
        fill: "backwards",
      });
    } catch {
      /* sin Web Animations: el cambio es inmediato */
    }

    // Foco: al volver, al control que abrió la vista siguiente; si no, al título.
    let target: HTMLElement | null = null;
    if (direction === "back" && focusKey && panelRef.current) {
      const sel = `[data-drawer-key="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(focusKey) : focusKey}"]`;
      target = panelRef.current.querySelector<HTMLElement>(sel);
    }
    (target ?? titleRef.current)?.focus({ preventScroll: true });
    if (target) target.scrollIntoView({ block: "nearest" });
  }, [viewKey, open, direction, focusKey]);

  /* ---- Arrastre de la hoja inferior (solo teléfono) ---- */
  const drag = useRef<{
    id: number;
    y0: number;
    x0: number;
    dy: number;
    active: boolean;
    samples: { y: number; t: number }[];
  } | null>(null);

  const clearInline = () => {
    const p = panelRef.current;
    const b = backdropRef.current;
    if (p) {
      p.style.transform = "";
      p.style.transition = "";
    }
    if (b) {
      b.style.opacity = "";
      b.style.transition = "";
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Desde un botón también se puede arrastrar: solo cuenta si se mueve.
    if (!e.isPrimary || e.button !== 0 || !window.matchMedia(SHEET_QUERY).matches) return;
    drag.current = { id: e.pointerId, y0: e.clientY, x0: e.clientX, dy: 0, active: false, samples: [] };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const p = panelRef.current;
    if (!d || d.id !== e.pointerId || !p) return;
    const dy = e.clientY - d.y0;
    const dx = e.clientX - d.x0;
    if (!d.active) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
        drag.current = null;
        return;
      }
      d.active = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* sin captura: el arrastre sigue mientras el dedo esté encima */
      }
      p.style.transition = "none";
      if (backdropRef.current) backdropRef.current.style.transition = "none";
    }
    d.dy = Math.max(0, dy);
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    if (d.samples.length > 5) d.samples.shift();
    p.style.transform = `translateY(${d.dy}px)`;
    if (backdropRef.current) {
      backdropRef.current.style.opacity = String(Math.max(0, 1 - d.dy / p.offsetHeight));
    }
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    const p = panelRef.current;
    if (!d || !d.active || !p) return;
    const s = d.samples;
    const v = s.length > 1 ? (s[s.length - 1].y - s[0].y) / Math.max(1, s[s.length - 1].t - s[0].t) : 0;
    const shouldClose = e.type !== "pointercancel" && (d.dy > p.offsetHeight * 0.25 || v > 0.5);
    const b = backdropRef.current;
    if (shouldClose) {
      // Sigue desde donde quedó el dedo hasta salir de la pantalla.
      p.style.transition = "transform 200ms var(--ease-exit)";
      p.style.transform = "translateY(100%)";
      if (b) {
        b.style.transition = "opacity 180ms var(--ease-exit)";
        b.style.opacity = "0";
      }
      latest.current.onClose();
      window.setTimeout(clearInline, 260);
    } else {
      p.style.transition = "transform 200ms var(--ease-enter)";
      p.style.transform = "";
      if (b) {
        b.style.transition = "opacity 200ms var(--ease-enter)";
        b.style.opacity = "";
      }
      window.setTimeout(clearInline, 220);
    }
  };

  const onBodyScroll = () => {
    if (bodyRef.current) scrollMap.current.set(viewKeyRef.current, bodyRef.current.scrollTop);
  };

  if (!mounted) return null;

  const motion = reduced
    ? "transition-opacity duration-150 ease-linear"
    : open
      ? "transition-transform duration-[260ms] ease-enter"
      : "transition-transform duration-200 ease-exit";
  const position = reduced
    ? open
      ? "opacity-100"
      : "opacity-0"
    : open
      ? "translate-y-0 sm:translate-x-0"
      : "translate-y-full sm:translate-x-full sm:translate-y-0";

  return createPortal(
    <div
      ref={rootRef}
      className={clsx(
        "fixed inset-0 z-50 print:hidden",
        !open && "pointer-events-none",
        !open && !shown && "invisible"
      )}
      aria-hidden={!open}
    >
      {/* Fondo (sin desenfoque: animar un blur de toda la página es caro). */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className={clsx(
          "absolute inset-0 bg-slate-900/45 transition-opacity dark:bg-black/60",
          open ? "opacity-100 duration-[260ms] ease-enter" : "opacity-0 duration-[180ms] ease-exit"
        )}
      />

      {/* Panel / hoja */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={open ? "open" : "closed"}
        className={clsx(
          "absolute flex flex-col overflow-hidden bg-surface shadow-3",
          "inset-x-0 bottom-0 h-[88dvh] rounded-t-hero",
          "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-full sm:max-w-lg sm:rounded-none sm:border-l sm:border-line",
          motion,
          position
        )}
      >
        <div
          className="shrink-0 touch-none border-b border-line sm:touch-auto"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {/* Asa (teléfono): arrastrar hacia abajo cierra. */}
          <div className="flex justify-center pb-0.5 pt-2 sm:hidden" aria-hidden>
            <span className="h-1 w-9 rounded-full bg-line-strong/50" />
          </div>
          <header className="flex items-start gap-1.5 px-3 pb-3 pt-1 sm:px-5 sm:py-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel ? `Volver a ${backLabel}` : "Volver"}
                title={backLabel ? `Volver a ${backLabel}` : undefined}
                className="group inline-flex min-h-11 max-w-[11rem] shrink-0 items-center gap-1 rounded-control px-2 text-small font-semibold text-link transition-colors duration-fast hover:bg-primary-soft active:bg-primary-soft"
              >
                <Icon
                  name="arrow-left"
                  className="h-4 w-4 shrink-0 transition-transform duration-fast ease-enter group-hover:-translate-x-0.5"
                />
                <span className="truncate">{backLabel ?? "Volver"}</span>
              </button>
            )}
            <div className={clsx("min-w-0 flex-1 pt-1", onBack && "border-l border-line pl-3")}>
              {eyebrow && (
                <p className="text-caption font-semibold uppercase tracking-[0.04em] text-link">
                  {eyebrow}
                </p>
              )}
              <h2
                id={titleId}
                ref={titleRef}
                tabIndex={-1}
                className="line-clamp-2 text-title font-bold text-heading outline-none"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel"
              className="btn-ghost btn btn-icon shrink-0 rounded-full px-0 text-ink-2"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </header>
          {pager && pager.total > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2 px-3 py-1 sm:px-5">
              <button
                type="button"
                onClick={pager.onPrev}
                disabled={!pager.onPrev}
                aria-label={pager.prevLabel ? `Anterior: ${pager.prevLabel}` : "Persona anterior"}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <Icon name="chevron-left" className="h-5 w-5" />
              </button>
              <p className="text-small text-ink-2" aria-live="polite">
                Persona <strong className="tabular-nums text-ink">{pager.index + 1}</strong> de{" "}
                <span className="tabular-nums">{pager.total}</span>
                <span className="hidden text-muted sm:inline"> · use ← y →</span>
              </p>
              <button
                type="button"
                onClick={pager.onNext}
                disabled={!pager.onNext}
                aria-label={pager.nextLabel ? `Siguiente: ${pager.nextLabel}` : "Persona siguiente"}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <Icon name="chevron-right" className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div
          ref={bodyRef}
          onScroll={onBodyScroll}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5"
        >
          <div key={viewKey} ref={contentRef}>
            {children}
          </div>
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-line bg-surface-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
