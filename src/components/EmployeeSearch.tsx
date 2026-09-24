"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { EmployeeStatus } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";

const DOT: Record<SemaphoreLevel, string> = {
  green: "bg-status-green",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
};

/**
 * Buscador rápido de empleados con resultados en vivo (typeahead). Busca por
 * nombre, ID, área, dirección, planta o jefe y enlaza directo a la ficha.
 */
export function EmployeeSearch({
  rows,
  hrefBase,
  roleParam,
  query,
}: {
  rows: EmployeeStatus[];
  hrefBase: string;
  roleParam?: string;
  /** Filtros vigentes, para volver al panel tal como estaba. */
  query?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return rows
      .filter((r) =>
        [r.name, r.code, r.area, r.direccion, r.plant, r.managerName]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      )
      .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime)
      .slice(0, 8);
  }, [rows, q]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const link = (id: string) => {
    const qs = [query, roleParam ? `rol=${roleParam}` : ""].filter(Boolean).join("&");
    return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && results[active]) {
              window.location.href = link(results[active].id);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Buscar empleado por nombre, ID, área, dirección, planta o jefe…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          autoComplete="off"
          role="combobox"
          aria-label="Buscar empleado"
          aria-autocomplete="list"
          aria-controls="employee-search-listbox"
          aria-expanded={open && !!q.trim() && results.length > 0}
          aria-activedescendant={
            open && results[active] ? `emp-opt-${results[active].id}` : undefined
          }
        />
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {q.trim() ? `${results.length} coincidencias` : ""}
      </span>

      {open && q.trim() && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <div className="px-4 py-4 text-center text-sm text-slate-500">
              Sin coincidencias para “{q.trim()}”.
            </div>
          ) : (
            <ul
              id="employee-search-listbox"
              role="listbox"
              aria-label="Empleados coincidentes"
              className="max-h-80 overflow-auto"
            >
              {results.map((r, i) => (
                <li key={r.id} id={`emp-opt-${r.id}`} role="option" aria-selected={i === active}>
                  <Link
                    href={link(r.id)}
                    tabIndex={-1}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-2.5 transition",
                      i === active ? "bg-brand-tint" : "hover:bg-brand-tint"
                    )}
                  >
                    <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", DOT[r.level])} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {r.name ?? r.code}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {[r.area, r.direccion, r.plant].filter(Boolean).join(" · ") || "—"}
                        {r.managerName ? ` · Jefe: ${r.managerName}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className="block font-semibold tabular-nums text-brand-dark">
                        {r.monthlyOvertime.toFixed(0)}h
                      </span>
                      <span className="block text-[10px] text-slate-500">mes</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
