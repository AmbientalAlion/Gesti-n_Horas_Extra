"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ComponentProps, type MouseEvent } from "react";

// useLayoutEffect en el cliente (cierra la transición antes de pintar), sin aviso en el servidor.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Navegación del menú con View Transitions (mejora progresiva).
 *
 *   <TransitionLink href="/upload">Cargar archivo</TransitionLink>
 *   <ViewTransitions />   // una vez en el layout: cierra la transición
 *
 * - Sin soporte (document.startViewTransition), con teclas modificadoras,
 *   target, otra pestaña o la misma ruta: se comporta como <Link>.
 * - Con soporte: congela la imagen actual, navega y suelta la transición
 *   cuando cambia el pathname (el loading.tsx de cada ruta hace que eso
 *   ocurra en uno o dos fotogramas). Si tarda más de 300ms, se salta la
 *   animación para no dejar la pantalla congelada: el esqueleto toma el
 *   relevo.
 * - Los nombres view-transition-name («page», «app-nav», «app-top») se ponen
 *   solo durante la transición, sobre los elementos visibles con data-vt.
 *   Así no interfieren con el revelado circular del cambio de tema.
 * - Con movimiento reducido, globals.css convierte todo en un fundido de
 *   150ms (se reduce, no se elimina).
 * - Solo el pathname cierra la transición: los filtros cambian searchParams
 *   y no deben animar la página entera.
 */

type VT = {
  finished: Promise<void>;
  skipTransition?: () => void;
};
type DocVT = Document & { startViewTransition?: (cb: () => Promise<void>) => VT };

const SKIP_AFTER = 300;

let resolvePending: (() => void) | null = null;
let focusAfter = false;

function settle() {
  const r = resolvePending;
  resolvePending = null;
  r?.();
}

function nameTargets(on: boolean) {
  document.querySelectorAll<HTMLElement>("[data-vt]").forEach((el) => {
    // Solo los visibles: dos elementos con el mismo nombre anulan la transición.
    const visible = on && el.getClientRects().length > 0;
    el.style.setProperty("view-transition-name", visible ? el.dataset.vt! : "");
  });
}

function isModified(e: MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** Navega con View Transition si se puede; devuelve false si no la usó. */
export function navigateWithTransition(push: (href: string) => void, href: string): boolean {
  const doc = document as DocVT;
  if (typeof doc.startViewTransition !== "function") return false;
  settle();
  nameTargets(true);
  let vt: VT | null = null;
  let timer = 0;
  try {
    vt = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          resolvePending = () => {
            window.clearTimeout(timer);
            resolve();
          };
          push(href);
          timer = window.setTimeout(() => {
            vt?.skipTransition?.();
            settle();
          }, SKIP_AFTER);
        })
    );
  } catch {
    nameTargets(false);
    return false;
  }
  vt.finished.catch(() => {}).finally(() => nameTargets(false));
  return true;
}

export function TransitionLink({
  href,
  onClick,
  onNavigate,
  ...rest
}: ComponentProps<typeof Link> & {
  href: string;
  /** Se llama al iniciar la navegación (p. ej. para marcar el destino). */
  onNavigate?: (href: string) => void;
}) {
  const router = useRouter();

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || isModified(e)) return;
    if (rest.target && rest.target !== "_self") return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;
    onNavigate?.(href);
    if (url.pathname === window.location.pathname) return; // solo cambian parámetros: <Link>
    // Tras navegar con el menú, el foco pasa al contenido (lector de pantalla
    // y teclado empiezan por la página nueva, no por el menú).
    focusAfter = true;
    if (navigateWithTransition((h) => router.push(h), href)) e.preventDefault();
  };

  return <Link href={href} onClick={handle} {...rest} />;
}

/** Cierra la transición pendiente cuando el pathname cambia. Montar una vez. */
export function ViewTransitions() {
  const pathname = usePathname();
  const first = useRef(true);
  useIsoLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    settle();
    if (focusAfter) {
      focusAfter = false;
      const main = document.getElementById("contenido");
      main?.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}
