"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Icon } from "./ui/Icon";
import { Spinner } from "./ui/Spinner";
import { useNavigateSearch } from "./dashboard/DashboardNav";
import type { FilterOptions, Filters } from "@/lib/aggregate";

const KEYS = ["planta", "direccion", "area", "ceco", "jefe"] as const;
type Key = (typeof KEYS)[number];

// Al cambiar un filtro más amplio, se limpian los dependientes para no dejar
// selecciones incoherentes (p. ej. una planta nueva con un área de otra sede).
const DEPENDENTS: Record<Key, Key[]> = {
  planta: ["direccion", "area", "ceco", "jefe"],
  direccion: ["area", "ceco", "jefe"],
  area: ["ceco"],
  ceco: ["area"],
  jefe: [],
};

const LABELS: Record<Key, string> = {
  planta: "Planta",
  direccion: "Dirección",
  area: "Área",
  ceco: "Centro de costo",
  jefe: "Jefe",
};

const FIELD_LABELS: Record<Key, string> = {
  planta: "Planta / sede",
  direccion: "Dirección",
  area: "Área",
  ceco: "Centro de costo",
  jefe: "Jefe / supervisor",
};

/** «Todas» para planta, dirección y área; «Todos» para jefe y centro de costo. */
const ALL: Record<Key, string> = {
  planta: "Todas",
  direccion: "Todas",
  area: "Todas",
  ceco: "Todos",
  jefe: "Todos",
};

const COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
};

/**
 * Filtros del panel.
 *
 * - Teléfono: un botón «Filtros (n)» abre el panel con una transición de
 *   altura; desde sm los selects están siempre a la vista.
 * - Los filtros activos son chips que se quitan con un toque.
 * - Un filtro con una sola opción no se ofrece como select: se muestra como
 *   alcance fijo («Planta: Rionegro»).
 * - Los selects no se deshabilitan mientras carga (el foco no se pierde);
 *   la región de datos se atenúa con la transición compartida del panel.
 * - La regla de la cascada solo se explica cuando de verdad limpia algo.
 */
export function DashboardFilters({
  options,
  current,
}: {
  options: FilterOptions;
  current: Filters;
}) {
  const params = useSearchParams();
  const { isPending, navigate } = useNavigateSearch();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number>();
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const values: Record<Key, string> = {
    planta: current.plant ?? "",
    direccion: current.direccion ?? "",
    area: current.area ?? "",
    ceco: current.costCenter ?? "",
    jefe: current.manager ?? "",
  };
  const opts: Record<Key, string[]> = {
    planta: options.plants,
    direccion: options.directions,
    area: options.areas,
    ceco: options.costCenters,
    jefe: options.managers,
  };

  const selectable = KEYS.filter((k) => opts[k].length > 1 || values[k]);
  const fixed = KEYS.filter((k) => opts[k].length === 1 && !values[k]);
  const activos = KEYS.filter((k) => values[k]);

  // En el teléfono, cerrado = inerte; desde sm el panel siempre está abierto.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => el.toggleAttribute("inert", !open && !mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [open]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6000);
  };

  const setParam = (key: Key, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const removed: string[] = [];
    for (const dep of DEPENDENTS[key]) {
      if (next.get(dep)) removed.push(`${LABELS[dep]}: ${next.get(dep)}`);
      next.delete(dep);
    }
    if (removed.length > 0) {
      showNotice(
        `Se quitó ${removed.join(" y ")} al cambiar ${LABELS[key].toLowerCase()}, para que la selección sea coherente.`
      );
    }
    navigate(next.toString());
  };

  const clearOne = (key: Key) => {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    navigate(next.toString());
  };

  const clearAll = () => {
    const next = new URLSearchParams(params.toString());
    KEYS.forEach((k) => next.delete(k));
    navigate(next.toString());
  };

  if (selectable.length === 0 && fixed.length === 0) return null;

  return (
    <section
      aria-label="Filtros del panel"
      aria-busy={isPending || undefined}
      className="reveal card p-3 print:hidden sm:p-4"
      style={{ "--i": 1 } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center gap-2">
        {selectable.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={panelId}
              className="btn-secondary btn-sm min-h-11 sm:hidden"
            >
              <Icon name="filter" className="h-4 w-4" />
              Filtros
              {activos.length > 0 && (
                <span className="rounded-full bg-brand-900 px-1.5 text-caption font-bold tabular-nums text-white dark:bg-brand-300 dark:text-[#0B1524]">
                  {activos.length}
                  <span className="sr-only"> activos</span>
                </span>
              )}
              <Icon
                name="chevron-down"
                className={clsx(
                  "h-4 w-4 transition-transform duration-[240ms] ease-move",
                  open && "rotate-180"
                )}
              />
            </button>
            <h2 className="hidden items-center gap-2 text-small font-semibold text-heading sm:inline-flex">
              <Icon name="filter" className="h-4 w-4 text-muted" />
              Filtrar la vista
            </h2>
          </>
        )}

        {fixed.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-caption text-muted">
            <span className="sr-only sm:not-sr-only">Su alcance:</span>
            {fixed.map((k) => (
              <span key={k} className="chip">
                <span className="text-muted">{LABELS[k]}:</span>
                <span className="font-semibold text-ink-2">{opts[k][0]}</span>
              </span>
            ))}
          </p>
        )}

        {isPending && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-caption font-medium text-link">
            <Spinner className="h-3.5 w-3.5" />
            Actualizando…
          </span>
        )}
      </div>

      {activos.length > 0 && (
        <ul className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
          {activos.map((k) => (
            <li key={k} className="animate-scale-in">
              <button
                type="button"
                onClick={() => clearOne(k)}
                className="chip-brand chip-interactive group max-w-[18rem]"
                title={`Quitar el filtro de ${LABELS[k].toLowerCase()}`}
              >
                <span className="text-ink-2">{LABELS[k]}:</span>
                <span className="truncate font-semibold">{values[k]}</span>
                <Icon
                  name="close"
                  className="h-3.5 w-3.5 shrink-0 text-muted transition-colors duration-fast group-hover:text-ink"
                />
                <span className="sr-only">(quitar)</span>
              </button>
            </li>
          ))}
          {activos.length > 1 && (
            <li>
              <button type="button" onClick={clearAll} className="btn-ghost btn-sm">
                Quitar todos
              </button>
            </li>
          )}
        </ul>
      )}

      {notice && (
        <p
          role="status"
          className="mt-2 flex items-start gap-2 rounded-control bg-info-soft px-3 py-2 text-small text-info animate-fade-up"
        >
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      {selectable.length > 0 && (
        <div
          id={panelId}
          ref={panelRef}
          className={clsx(
            "grid transition-[grid-template-rows] sm:grid-rows-[1fr]",
            open
              ? "grid-rows-[1fr] duration-[280ms] ease-enter"
              : "grid-rows-[0fr] duration-[220ms] ease-exit"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={clsx(
                "grid gap-3 pt-3 transition-[opacity,transform] sm:translate-y-0 sm:opacity-100",
                COLS[selectable.length],
                open
                  ? "translate-y-0 opacity-100 delay-[60ms] duration-[200ms] ease-enter"
                  : "-translate-y-1 opacity-0 duration-[120ms] ease-exit"
              )}
            >
              {selectable.map((k) => (
                <div key={k} className="min-w-0">
                  <label className="label-field" htmlFor={`filtro-${k}`}>
                    {FIELD_LABELS[k]}
                  </label>
                  <select
                    id={`filtro-${k}`}
                    value={values[k]}
                    onChange={(e) => setParam(k, e.target.value)}
                    className="field"
                  >
                    <option value="">{ALL[k]}</option>
                    {(values[k] && !opts[k].includes(values[k])
                      ? [values[k], ...opts[k]]
                      : opts[k]
                    ).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
