"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";
import { subscribeToasts, toast, type ToastItem } from "./toast";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * Pila de avisos. Se monta una sola vez en src/app/layout.tsx; para mostrar
 * un aviso use `toast.success|error|info()` de "@/components/ui/toast".
 *
 * Posición: abajo a la derecha desde 640px; en el teléfono, a todo el ancho
 * abajo. Si una barra inferior fija tapa los avisos, defina en ese layout la
 * variable CSS `--toast-offset` (p. ej. `[--toast-offset:5rem] lg:[--toast-offset:1.5rem]`).
 */
type Rendered = ToastItem & { leaving?: boolean };

const EXIT_MS = 180;

export function Toaster() {
  const [list, setList] = useState<Rendered[]>([]);
  const [announce, setAnnounce] = useState("");
  const seen = useRef(new Set<number>());

  useEffect(() => {
    return subscribeToasts((items) => {
      const ids = new Set(items.map((t) => t.id));
      // Anuncio cortés para lectores de pantalla (los errores usan role=alert).
      for (const t of items) {
        if (!seen.current.has(t.id)) {
          seen.current.add(t.id);
          if (t.tone !== "error") {
            setAnnounce(t.description ? `${t.title} ${t.description}` : t.title);
          }
        }
      }
      setList((prev) => {
        const leaving = prev
          .filter((p) => !ids.has(p.id))
          .map((p) => ({ ...p, leaving: true }));
        const merged: Rendered[] = [...items, ...leaving];
        // Mantener el orden de llegada.
        merged.sort((a, b) => a.id - b.id);
        return merged;
      });
      // Retirar del DOM los que salen, tras su animación.
      const delay = prefersReducedMotion() ? 0 : EXIT_MS;
      window.setTimeout(() => {
        setList((prev) => prev.filter((p) => !p.leaving || ids.has(p.id)));
      }, delay);
    });
  }, []);

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>
      <ol
        aria-label="Avisos"
        className={clsx(
          "pointer-events-none fixed inset-x-4 z-[70] flex flex-col gap-2 print:hidden",
          "bottom-[calc(var(--toast-offset,1rem)+env(safe-area-inset-bottom))]",
          "sm:inset-x-auto sm:right-6 sm:w-[22rem] sm:bottom-[calc(var(--toast-offset,1.5rem)+env(safe-area-inset-bottom))]"
        )}
      >
        {list.map((t) => (
          <ToastCard key={t.id} item={t} />
        ))}
      </ol>
    </>
  );
}

const TONE = {
  success: { border: "border-l-ok-solid", icon: "text-ok", bar: "bg-ok-solid" },
  error: { border: "border-l-over-solid", icon: "text-over", bar: "bg-over-solid" },
  info: { border: "border-l-primary", icon: "text-link", bar: "bg-primary" },
} as const;

function ToastCard({ item }: { item: Rendered }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!item.duration || item.leaving) return;
    if (paused) return;
    startedAt.current = Date.now();
    const t = window.setTimeout(() => toast.dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(t);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, item.duration, item.id, item.leaving]);

  const tone = TONE[item.tone];
  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <li
      className={clsx(
        "pointer-events-auto relative overflow-hidden rounded-card border border-l-4 border-line bg-surface shadow-3",
        tone.border,
        item.leaving
          ? "opacity-0 transition-[opacity,transform] duration-fast ease-exit motion-safe:translate-y-2"
          : "animate-fade-up"
      )}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div
        className="flex items-start gap-3 py-3 pl-3 pr-1.5"
        {...(item.tone === "error" ? { role: "alert" } : {})}
      >
        <span className={clsx("mt-0.5", tone.icon)}>
          {item.tone === "success" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <circle cx="12" cy="12" r="8.5" />
              <path
                d="m8.2 12.3 2.6 2.6 5-5.3"
                pathLength={1}
                strokeDasharray={1}
                className="motion-safe:animate-draw-line motion-safe:[animation-delay:120ms] motion-safe:[animation-duration:300ms]"
              />
            </svg>
          ) : (
            <Icon name={item.tone === "error" ? "alert" : "info"} className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-sm font-semibold text-ink">{item.title}</p>
          {item.description && <p className="mt-0.5 text-small text-ink-2">{item.description}</p>}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(item.id)}
          className="btn-ghost btn-icon -my-1.5 h-10 w-10 min-h-10 text-muted hover:text-ink sm:h-9 sm:w-9 sm:min-h-9"
          aria-label="Cerrar aviso"
        >
          <Icon name="close" />
        </button>
      </div>
      {item.duration > 0 && !item.leaving && (
        <span
          aria-hidden
          className={clsx("absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-60", tone.bar)}
          style={{
            animation: `grow-x ${item.duration}ms linear reverse forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </li>
  );
}
