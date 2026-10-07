"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { EmployeeTable, parseSort, sortParam, type SortState } from "./EmployeeTable";
import { LEVEL_LABELS, LEVEL_TEXT, LevelIcon, PendingIcon } from "./StatusBadge";
import { Icon } from "./ui/Icon";
import type { EmployeeStatus } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";
import { RULES } from "@/lib/overtime";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Minúsculas y sin tildes: «gomez» encuentra «Gómez». */
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Evento con el que el buscador global pasa su término a la tabla. */
export const TABLE_SEARCH_EVENT = "horas:buscar-en-tabla";

type Estado = "" | SemaphoreLevel;
const ESTADOS: { value: Estado; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "red", label: LEVEL_LABELS.red },
  { value: "yellow", label: LEVEL_LABELS.yellow },
  { value: "green", label: LEVEL_LABELS.green },
];
const isEstado = (v: string | null): v is SemaphoreLevel => v === "red" || v === "yellow" || v === "green";

/**
 * Escribe los filtros de la tabla en la URL sin pedir nada al servidor
 * (history.replaceState; Next 14.2 lo sincroniza con useSearchParams). Así
 * viajan a la ficha y vuelven con «Volver al dashboard».
 */
function writeUrl(patch: Record<string, string>) {
  try {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(patch)) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    if (url.href !== window.location.href) window.history.replaceState(null, "", url.href);
  } catch {
    /* sin historial: los filtros siguen funcionando, solo no se recuerdan */
  }
}

export function FilterableEmployeeTable({
  rows,
  hrefBase,
  roleParam,
  query,
}: {
  rows: EmployeeStatus[];
  hrefBase?: string;
  roleParam?: string;
  /** Filtros vigentes, para volver al panel tal como estaba. */
  query?: string;
}) {
  // Los filtros de planta/área/jefe son globales (arriba del panel). Aquí solo
  // quedan la búsqueda por nombre/ID/área y el filtro por estado.
  const params = useSearchParams();
  const [q, setQ] = useState(() => params.get("buscar") ?? "");
  const [estado, setEstado] = useState<Estado>(() => {
    const v = params.get("estado");
    return isEstado(v) ? v : "";
  });
  const [revisar, setRevisar] = useState(() => params.get("revisar") === "1");
  const [semana, setSemana] = useState(() => params.get("semana") === "1");
  const [sort, setSort] = useState<SortState>(() => parseSort(params.get("orden")));
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQ = useDeferredValue(q);

  // La búsqueda va a la URL con 250ms de espera (no en cada tecla).
  useEffect(() => {
    const t = window.setTimeout(() => writeUrl({ buscar: q.trim() }), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const update = (patch: { estado?: Estado; revisar?: boolean; semana?: boolean; sort?: SortState }) => {
    if (patch.estado !== undefined) setEstado(patch.estado);
    if (patch.revisar !== undefined) setRevisar(patch.revisar);
    if (patch.semana !== undefined) setSemana(patch.semana);
    if (patch.sort) setSort(patch.sort);
    writeUrl({
      ...(patch.estado !== undefined && { estado: patch.estado }),
      ...(patch.revisar !== undefined && { revisar: patch.revisar ? "1" : "" }),
      ...(patch.semana !== undefined && { semana: patch.semana ? "1" : "" }),
      ...(patch.sort && { orden: sortParam(patch.sort) }),
    });
  };

  // «Buscar en la tabla» desde el buscador global.
  useEffect(() => {
    const onSearch = (e: Event) => {
      const term = (e as CustomEvent<string>).detail ?? "";
      setQ(term);
      update({ estado: "", revisar: false, semana: false });
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.scrollIntoView({ block: "start", behavior: "smooth" });
        el.focus({ preventScroll: true });
      });
    };
    window.addEventListener(TABLE_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(TABLE_SEARCH_EVENT, onSearch);
    // update solo escribe estado y URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () => ({
      "": rows.length,
      red: rows.filter((r) => r.level === "red").length,
      yellow: rows.filter((r) => r.level === "yellow").length,
      green: rows.filter((r) => r.level === "green").length,
      revisar: rows.filter((r) => r.hasError).length,
      semana: rows.filter((r) => r.highWeeksMonth > 0).length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = norm(deferredQ.trim());
    return rows.filter((r) => {
      if (estado && r.level !== estado) return false;
      if (revisar && !r.hasError) return false;
      if (semana && r.highWeeksMonth === 0) return false;
      if (
        term &&
        !norm(r.name ?? "").includes(term) &&
        !norm(r.code).includes(term) &&
        !norm(r.area ?? "").includes(term)
      )
        return false;
      return true;
    });
  }, [rows, deferredQ, estado, revisar, semana]);

  const anyState = !!estado || revisar || semana;
  const stateLabel = [
    estado ? LEVEL_LABELS[estado] : "",
    revisar ? "Por revisar" : "",
    semana ? `Semana > ${RULES.WEEKLY_OVERTIME_LIMIT}h` : "",
  ]
    .filter(Boolean)
    .join(" + ");
  const term = q.trim();
  const emptyTitle = term
    ? anyState
      ? `Nadie en «${stateLabel}» coincide con «${term}»`
      : `Sin coincidencias para «${term}»`
    : `Nadie en «${stateLabel}»`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <label className="sr-only" htmlFor="tabla-buscar">
            Buscar en la tabla por nombre, ID o área
          </label>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            ref={inputRef}
            id="tabla-buscar"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && q) {
                e.preventDefault();
                setQ("");
              }
            }}
            placeholder="Buscar por nombre, ID o área"
            autoComplete="off"
            className="field pl-9 pr-11 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label="Borrar búsqueda"
              className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:bg-surface-3 hover:text-ink motion-safe:animate-scale-in"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          )}
        </div>

        <StateChips
          estado={estado}
          counts={counts}
          onEstado={(v) => update({ estado: v })}
          revisar={revisar}
          semana={semana}
          onRevisar={() => update({ revisar: !revisar })}
          onSemana={() => update({ semana: !semana })}
        />

        <p className="shrink-0 text-small text-ink-2 lg:ml-auto" role="status" aria-live="polite">
          Mostrando <strong className="tabular-nums text-ink">{filtered.length}</strong> de{" "}
          <span className="tabular-nums">{rows.length}</span>
        </p>
      </div>

      <EmployeeTable
        rows={filtered}
        hrefBase={hrefBase}
        roleParam={roleParam}
        query={query}
        sort={sort}
        onSortChange={(s) => update({ sort: s })}
        emptyTitle={rows.length === 0 ? undefined : emptyTitle}
        emptyText={
          rows.length === 0
            ? undefined
            : term
              ? "Pruebe con el apellido, el ID o una parte del nombre del área."
              : "Con los filtros del panel no hay personas en esta condición."
        }
        emptyActions={
          rows.length === 0 ? undefined : (
            <>
              {term && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setQ("");
                    inputRef.current?.focus();
                  }}
                >
                  Limpiar búsqueda
                </button>
              )}
              {anyState && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => update({ estado: "", revisar: false, semana: false })}
                >
                  Ver todos los estados
                </button>
              )}
            </>
          )
        }
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */

/**
 * Filtro de estado como chips con conteo. «Todos / Excedido / En riesgo /
 * Normal» es un grupo de radio (flechas para moverse, un indicador de fondo
 * se desliza al elegido); «Por revisar» y «Semana > 12h» se combinan.
 */
function StateChips({
  estado,
  counts,
  onEstado,
  revisar,
  semana,
  onRevisar,
  onSemana,
}: {
  estado: Estado;
  counts: Record<"" | SemaphoreLevel | "revisar" | "semana", number>;
  onEstado: (v: Estado) => void;
  revisar: boolean;
  semana: boolean;
  onRevisar: () => void;
  onSemana: () => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const g = groupRef.current;
    const el = g?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!g || !el) return;
    setPill({ x: el.offsetLeft, w: el.offsetWidth });
  }, []);

  useIsoLayoutEffect(() => {
    measure();
  }, [estado, counts, measure]);

  useEffect(() => {
    // La primera colocación no se anima; las siguientes sí.
    const t = requestAnimationFrame(() => setAnimate(true));
    const g = groupRef.current;
    if (!g || typeof ResizeObserver === "undefined") return () => cancelAnimationFrame(t);
    const ro = new ResizeObserver(() => measure());
    ro.observe(g);
    return () => {
      cancelAnimationFrame(t);
      ro.disconnect();
    };
  }, [measure]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = ESTADOS.findIndex((x) => x.value === estado);
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % ESTADOS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + ESTADOS.length) % ESTADOS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = ESTADOS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onEstado(ESTADOS[n].value);
    requestAnimationFrame(() =>
      groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[n]?.focus()
    );
  };

  const ready = pill !== null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(90deg,transparent,#000_12px,#000_calc(100%-20px),transparent)] [scrollbar-width:none] sm:mx-0 sm:px-0 sm:[mask-image:none] lg:pb-0">
      <div className="flex w-max items-center gap-2">
        <div
          ref={groupRef}
          role="radiogroup"
          aria-label="Filtrar por estado"
          onKeyDown={onKeyDown}
          className="relative flex items-center gap-1 rounded-full border border-line bg-surface-2 p-1"
        >
          {ready && (
            <span
              aria-hidden
              className={clsx(
                "absolute left-0 top-1 h-[calc(100%-0.5rem)] rounded-full bg-primary shadow-1",
                animate && "transition-[transform,width] duration-[200ms] ease-move motion-reduce:transition-none"
              )}
              style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
            />
          )}
          {ESTADOS.map((o) => {
            const checked = estado === o.value;
            return (
              <button
                key={o.value || "todos"}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => onEstado(o.value)}
                className={clsx(
                  "relative inline-flex min-h-9 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-small font-semibold transition-colors duration-fast",
                  checked
                    ? clsx("text-on-primary", !ready && "bg-primary")
                    : "text-ink-2 hover:bg-surface-3 hover:text-ink"
                )}
              >
                {o.value && (
                  <LevelIcon level={o.value} className={checked ? "text-on-primary" : LEVEL_TEXT[o.value]} />
                )}
                {o.label}
                <span
                  className={clsx(
                    "tabular-nums",
                    checked ? "text-on-primary" : "text-muted"
                  )}
                >
                  {counts[o.value]}
                </span>
              </button>
            );
          })}
        </div>

        <ToggleChip pressed={revisar} onClick={onRevisar} count={counts.revisar} tone="pending">
          <PendingIcon className="text-pending" />
          Por revisar
        </ToggleChip>
        <ToggleChip pressed={semana} onClick={onSemana} count={counts.semana} tone="info">
          <Icon name="info" className="h-3.5 w-3.5 text-info" />
          Semana &gt; {RULES.WEEKLY_OVERTIME_LIMIT}h
        </ToggleChip>
      </div>
    </div>
  );
}

function ToggleChip({
  pressed,
  onClick,
  count,
  tone,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  count: number;
  tone: "pending" | "info";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx(
        "inline-flex min-h-11 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-small font-semibold transition-[background-color,border-color,color] duration-fast active:scale-[0.98] sm:min-h-10",
        pressed
          ? tone === "pending"
            ? "border-pending-solid bg-pending-soft text-pending shadow-[inset_0_0_0_1px_rgb(var(--c-pending-solid))]"
            : "border-info-solid bg-info-soft text-info shadow-[inset_0_0_0_1px_rgb(var(--c-info-solid))]"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
      )}
    >
      {pressed && <Icon name="check" className="h-3.5 w-3.5 motion-safe:animate-scale-in" />}
      {children}
      <span className={clsx("tabular-nums", pressed ? "text-current" : "text-muted")}>{count}</span>
    </button>
  );
}
