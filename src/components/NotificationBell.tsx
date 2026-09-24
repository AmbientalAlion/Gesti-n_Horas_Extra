"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { PendingAuth } from "@/lib/data";

const DOW = ["L", "M", "M", "J", "V", "S", "D"];

function formatDay(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dow = new Date(y, m - 1, d).getDay() || 7;
  return `${DOW[dow - 1]} ${d}/${m}`;
}

/**
 * Campanita de notificaciones para quien aprueba (Director / RRHH): muestra el
 * número de solicitudes de horas extra pendientes y un panel con el detalle,
 * con acceso directo a la pantalla de autorizaciones.
 */
export function NotificationBell({
  items,
  href,
}: {
  items: PendingAuth[];
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificaciones${count ? `: ${count} pendientes` : ""}`}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-brand-dark transition hover:bg-brand-tint lg:h-9 lg:w-9"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-brand-dark">
              Solicitudes pendientes
            </span>
            <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand-dark">
              {count}
            </span>
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No hay solicitudes pendientes por aprobar.
            </div>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
              {items.slice(0, 8).map((it) => (
                <li key={it.id}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 transition hover:bg-brand-tint"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">
                        {it.employeeName}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-brand-dark">
                        {it.hours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {it.area} ·{" "}
                      {formatDay(it.dayDate) ?? `Semana ${it.week}`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={href}
            onClick={() => setOpen(false)}
            className={clsx(
              "block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-tint"
            )}
          >
            Ver todas las autorizaciones →
          </Link>
        </div>
      )}
    </div>
  );
}
