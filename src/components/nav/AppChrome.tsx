"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BrandMark } from "@/components/brand/BrandMark";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { TransitionLink, ViewTransitions } from "./TransitionLink";
import { activeIndex, sectionTitle, type NavSection } from "./sections";

/**
 * Estructura común de navegación para la app y la demo.
 *
 * Escritorio (lg+): barra lateral fija de 256px con logo, secciones con
 * icono y una pastilla activa que se desliza (transform, 320ms), un bloque
 * opcional (p. ej. «Ver como») y el pie de cuenta.
 *
 * Teléfono y tableta (<lg): barra superior compacta de 56px (logo, título de
 * la sección, acciones) que se esconde al bajar y vuelve al subir; y, si hay
 * más de una sección, barra inferior de pestañas de 64px + zona segura.
 *
 * - El activo se calcula por prefijo (/empleado cuenta como «Panel») y se
 *   marca al instante al hacer clic (optimista); aria-current queda solo en
 *   la ruta real. Si la espera pasa de 150ms aparece un spinner.
 * - Las posiciones del indicador salen del índice (alto fijo de cada
 *   ítem), así que el HTML del servidor ya trae la pastilla en su sitio.
 * - Con movimiento reducido la pastilla cambia sin deslizarse y la barra
 *   superior no se esconde.
 */
export function AppChrome({
  base,
  sections,
  query = "",
  sidebarExtra,
  sidebarFooter,
  mobileActions,
  pinTopBar = false,
}: {
  base: "" | "/demo";
  sections: NavSection[];
  /** Se añade a cada enlace (p. ej. «?rol=rrhh» en la demo). */
  query?: string;
  sidebarExtra?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  mobileActions?: React.ReactNode;
  /** Mantiene visible la barra superior (p. ej. con un menú abierto). */
  pinTopBar?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const current = activeIndex(sections, pathname, base);
  const [pending, setPending] = useState<number | null>(null);

  // La navegación terminó (o se canceló): el activo vuelve a ser la ruta real.
  useEffect(() => setPending(null), [pathname]);

  const shown = pending ?? current;
  const hrefOf = (s: NavSection) => `${base}${s.path}${query}`;
  const home = `${base}/dashboard${query}`;

  return (
    <>
      <ViewTransitions />
      <Sidebar
        sections={sections}
        current={current}
        shown={shown}
        pending={pending}
        hrefOf={hrefOf}
        home={home}
        onNavigate={setPending}
        extra={sidebarExtra}
        footer={sidebarFooter}
      />
      <TopBar
        title={sectionTitle(sections, pathname, base)}
        home={home}
        actions={mobileActions}
        pinned={pinTopBar}
        pathname={pathname}
      />
      {sections.length > 1 && (
        <TabBar
          sections={sections}
          current={current}
          shown={shown}
          hrefOf={hrefOf}
          onNavigate={setPending}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */

const ITEM_H = 44; // h-11
const ITEM_GAP = 4; // gap-1

function Sidebar({
  sections,
  current,
  shown,
  pending,
  hrefOf,
  home,
  onNavigate,
  extra,
  footer,
}: {
  sections: NavSection[];
  current: number;
  shown: number;
  pending: number | null;
  hrefOf: (s: NavSection) => string;
  home: string;
  onNavigate: (i: number) => void;
  extra?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <header
      data-vt="app-nav"
      className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface print:hidden lg:flex"
    >
      <div className="px-5 pb-3 pt-5">
        <Link href={home} className="inline-block rounded-control" aria-label="ALIÓN, ir al panel">
          <BrandMark size="md" />
        </Link>
        <p className="mt-3 text-small font-semibold text-ink-2">Control de Horas Extras</p>
      </div>

      <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="relative">
          <span
            aria-hidden
            className={clsx(
              "pointer-events-none absolute inset-x-0 top-0 h-11 rounded-control bg-primary-soft transition-[transform,opacity] duration-slow ease-move motion-reduce:transition-opacity",
              shown < 0 && "opacity-0"
            )}
            style={{ transform: `translateY(${Math.max(shown, 0) * (ITEM_H + ITEM_GAP)}px)` }}
          >
            <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-brand dark:bg-brand-300" />
          </span>
          <ul className="relative flex flex-col gap-1">
            {sections.map((s, i) => {
              const on = i === shown;
              return (
                <li key={s.path}>
                  <TransitionLink
                    href={hrefOf(s)}
                    onNavigate={() => onNavigate(i)}
                    aria-current={i === current ? "page" : undefined}
                    className={clsx(
                      "group flex h-11 items-center gap-3 rounded-control px-3 text-ui transition-colors duration-fast",
                      on
                        ? "font-semibold text-heading"
                        : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                    )}
                  >
                    <Icon
                      name={s.icon}
                      className={clsx(
                        "h-5 w-5 shrink-0 transition-colors duration-fast",
                        on ? "text-primary" : "text-muted group-hover:text-ink-2"
                      )}
                    />
                    <span className="truncate">{s.label}</span>
                    {pending === i && pending !== current && <PendingMark />}
                  </TransitionLink>
                </li>
              );
            })}
          </ul>
        </div>
        {extra}
      </nav>

      {footer && <div className="border-t border-line px-3 py-3">{footer}</div>}
    </header>
  );
}

/** Spinner que solo aparece si la espera pasa de 150ms. */
function PendingMark() {
  return (
    <span
      className="ml-auto inline-flex animate-fade-in text-primary"
      style={{ animationDelay: "150ms" }}
      aria-hidden
    >
      <Spinner className="h-3.5 w-3.5" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */

/** Foco de teclado dentro (un toque deja el foco en el botón, pero no cuenta). */
function hasKeyboardFocus(el: HTMLElement | null) {
  try {
    return !!el?.querySelector(":focus-visible");
  } catch {
    return !!el?.contains(document.activeElement);
  }
}

function useHideOnScroll(ref: React.RefObject<HTMLElement>, pinned: boolean, pathname: string) {
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  useEffect(() => setHidden(false), [pathname, pinned]);

  useEffect(() => {
    if (reduce) {
      setHidden(false);
      return;
    }
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const d = y - last;
        if (Math.abs(d) < 8) return;
        last = y;
        if (d < 0 || y < 64) setHidden(false);
        else if (!pinnedRef.current && !hasKeyboardFocus(ref.current)) setHidden(true);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduce, ref]);

  return [hidden, () => setHidden(false)] as const;
}

function TopBar({
  title,
  home,
  actions,
  pinned,
  pathname,
}: {
  title: string;
  home: string;
  actions?: React.ReactNode;
  pinned: boolean;
  pathname: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, show] = useHideOnScroll(ref, pinned, pathname);

  return (
    <header
      ref={ref}
      data-vt="app-top"
      onFocusCapture={show}
      className={clsx(
        "sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md transition-transform duration-base ease-enter print:hidden lg:hidden",
        hidden && "-translate-y-full"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-14 items-center gap-2 pl-3 pr-2">
        <Link href={home} className="shrink-0 rounded-control p-0.5" aria-label="ALIÓN, ir al panel">
          <BrandMark size="sm" />
        </Link>
        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-line" />
        <p className="min-w-0 flex-1 truncate text-ui font-semibold text-heading">{title}</p>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

function TabBar({
  sections,
  current,
  shown,
  hrefOf,
  onNavigate,
}: {
  sections: NavSection[];
  current: number;
  shown: number;
  hrefOf: (s: NavSection) => string;
  onNavigate: (i: number) => void;
}) {
  const n = sections.length;
  return (
    <nav
      aria-label="Secciones"
      data-vt="app-nav"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-md print:hidden lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Los avisos (toasts) suben por encima de la barra. */}
      <style>{`@media (max-width: 1023.98px){:root{--toast-offset:5.25rem}}`}</style>
      <div
        className="relative mx-auto grid h-16 max-w-xl"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-y-0 left-0 flex justify-center transition-[transform,opacity] duration-slow ease-move motion-reduce:transition-opacity",
            shown < 0 && "opacity-0"
          )}
          style={{ width: `${100 / n}%`, transform: `translateX(${Math.max(shown, 0) * 100}%)` }}
        >
          <span className="mt-2 h-8 w-14 rounded-full bg-primary-soft" />
        </span>
        {sections.map((s, i) => {
          const on = i === shown;
          return (
            <TransitionLink
              key={s.path}
              href={hrefOf(s)}
              onNavigate={() => onNavigate(i)}
              aria-current={i === current ? "page" : undefined}
              className={clsx(
                "relative flex min-w-0 flex-col items-center gap-1 pt-2 text-[12px] font-semibold leading-4 transition-colors duration-fast",
                on ? "text-heading" : "text-muted active:text-ink-2"
              )}
            >
              <span className="flex h-8 w-14 items-center justify-center">
                <Icon
                  name={s.icon}
                  className={clsx(
                    "h-6 w-6 transition-transform duration-base ease-pop",
                    on ? "scale-100 text-primary" : "scale-95"
                  )}
                />
              </span>
              <span className="max-w-full truncate px-1">{s.short}</span>
            </TransitionLink>
          );
        })}
      </div>
    </nav>
  );
}
