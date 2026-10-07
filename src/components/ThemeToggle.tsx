"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { prefersReducedMotion } from "@/components/ui/useReducedMotion";

type VT = { ready: Promise<void>; finished: Promise<void> };
type DocVT = Document & { startViewTransition?: (cb: () => void) => VT };

/**
 * Interruptor de modo oscuro.
 *
 *   <ThemeToggle />               // icono + «Modo oscuro» (44px en móvil)
 *   <ThemeToggle compact />       // solo icono, 44×44 / 40×40
 *
 * - Botón con aria-pressed (nombre fijo «Modo oscuro»): el estado no depende
 *   de la hidratación; el icono sol/luna se cruza solo por CSS (dark:).
 * - Con View Transitions y sin movimiento reducido, el nuevo tema se revela
 *   en círculo desde el botón (450ms). Si no, cambio inmediato.
 * - Sin preferencia guardada, sigue al sistema en vivo.
 */
export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [dark, setDark] = useState<boolean | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    setDark(root.classList.contains("dark"));
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystem = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("theme");
      } catch {
        /* sin almacenamiento */
      }
      if (stored) return;
      root.classList.toggle("dark", mq.matches);
      setDark(mq.matches);
    };
    mq?.addEventListener?.("change", onSystem);
    return () => mq?.removeEventListener?.("change", onSystem);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    const apply = () => {
      root.classList.toggle("dark", next);
      setDark(next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {
        /* sin almacenamiento */
      }
    };

    const doc = document as DocVT;
    if (!doc.startViewTransition || prefersReducedMotion()) {
      // Sin animación: que nada cambie a destiempo.
      root.classList.add("theme-switching");
      apply();
      window.setTimeout(() => root.classList.remove("theme-switching"), 50);
      return;
    }

    const r = btn.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top + r.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    root.classList.add("vt-theme");
    const vt = doc.startViewTransition(() => flushSync(apply));
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 450,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove("vt-theme"));
  };

  return (
    <button
      ref={btn}
      type="button"
      onClick={toggle}
      aria-pressed={dark ?? undefined}
      aria-label={compact ? "Modo oscuro" : undefined}
      title={compact ? "Modo oscuro" : undefined}
      className={clsx(
        "btn-ghost print:hidden",
        compact ? "btn-icon text-ink-2" : "btn-sm min-h-11 gap-2 px-2.5 text-ink-2 sm:min-h-9",
        className
      )}
    >
      <span className="relative inline-flex h-4 w-4" aria-hidden>
        <Icon
          name="moon"
          className="absolute inset-0 transition-[opacity,transform] duration-base ease-move dark:-rotate-90 dark:scale-50 dark:opacity-0"
        />
        <Icon
          name="sun"
          className="absolute inset-0 rotate-90 scale-50 opacity-0 transition-[opacity,transform] duration-base ease-move dark:rotate-0 dark:scale-100 dark:opacity-100"
        />
      </span>
      {!compact && <span>Modo oscuro</span>}
      {!compact && (
        <span
          aria-hidden
          className="relative ml-1 inline-flex h-4 w-7 items-center rounded-full bg-line-strong/50 transition-colors duration-base dark:bg-primary"
        >
          <span className="absolute left-0.5 h-3 w-3 rounded-full bg-surface shadow-1 transition-transform duration-base ease-move dark:translate-x-3" />
        </span>
      )}
    </button>
  );
}
