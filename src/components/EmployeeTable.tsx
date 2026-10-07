"use client";

import { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { StatusBadge } from "./StatusBadge";
import { EmployeeLink } from "./drawer/EmployeeLink";
import { useDrawer } from "./drawer/context";
import { Icon } from "./ui/Icon";
import { prefersReducedMotion } from "./ui/useReducedMotion";
import type { EmployeeStatus } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";
import { fmtH, RULES } from "@/lib/overtime";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ---- Orden (solo de presentación: no cambia ningún cálculo) ---- */

export type SortKey = "estado" | "persona" | "area" | "acumulado" | "sobre" | "semanas" | "proyeccion";
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}
/** Por defecto: lo más grave primero. */
export const DEFAULT_SORT: SortState = { key: "estado", dir: "desc" };

const SORT_KEYS: SortKey[] = ["estado", "persona", "area", "acumulado", "sobre", "semanas", "proyeccion"];

/** «acumulado-desc» → { key, dir } (o el orden por defecto). */
export function parseSort(v: string | null | undefined): SortState {
  const [k, d] = (v ?? "").split("-");
  if (SORT_KEYS.includes(k as SortKey) && (d === "asc" || d === "desc")) {
    return { key: k as SortKey, dir: d };
  }
  return DEFAULT_SORT;
}
export const sortParam = (s: SortState) =>
  s.key === DEFAULT_SORT.key && s.dir === DEFAULT_SORT.dir ? "" : `${s.key}-${s.dir}`;

const SEVERITY: Record<SemaphoreLevel, number> = { red: 3, yellow: 2, green: 0 };
const collator = new Intl.Collator("es-CO", { sensitivity: "base" });

/**
 * Gravedad: Excedido; En riesgo (por cuánto pasa la meta y luego por la
 * proyección); con registros por revisar; Normal por acumulado.
 */
function bySeverity(a: EmployeeStatus, b: EmployeeStatus): number {
  const sa = SEVERITY[a.level] + (a.level === "green" && a.hasError ? 1 : 0);
  const sb = SEVERITY[b.level] + (b.level === "green" && b.hasError ? 1 : 0);
  return (
    sa - sb ||
    a.overTarget - b.overTarget ||
    a.projectedMonthlyOvertime - b.projectedMonthlyOvertime ||
    a.monthlyOvertime - b.monthlyOvertime
  );
}

const COMPARE: Record<SortKey, (a: EmployeeStatus, b: EmployeeStatus) => number> = {
  estado: bySeverity,
  persona: (a, b) => collator.compare(a.name ?? a.code, b.name ?? b.code),
  area: (a, b) => collator.compare(a.area ?? "", b.area ?? ""),
  acumulado: (a, b) => a.monthlyOvertime - b.monthlyOvertime,
  sobre: (a, b) => a.overTarget - b.overTarget,
  semanas: (a, b) => a.highWeeksMonth - b.highWeeksMonth,
  proyeccion: (a, b) => a.projectedMonthlyOvertime - b.projectedMonthlyOvertime,
};

export function sortRows(rows: EmployeeStatus[], s: SortState): EmployeeStatus[] {
  const cmp = COMPARE[s.key];
  const sign = s.dir === "asc" ? 1 : -1;
  return [...rows].sort(
    (a, b) => sign * cmp(a, b) || collator.compare(a.name ?? a.code, b.name ?? b.code)
  );
}

/** Color del acumulado: rojo sobre 48h, naranja sobre la meta a la fecha. */
function accClass(r: EmployeeStatus): string {
  if (r.level === "red") return "font-semibold text-over";
  if (r.risk === "meta") return "font-semibold text-risk";
  return "text-ink-2";
}

/** Acento izquierdo de la fila al pasar el ratón, del color del estado. */
const ROW_ACCENT: Record<SemaphoreLevel, string> = {
  green: "hover:shadow-[inset_3px_0_0_rgb(var(--c-ok-solid))]",
  yellow: "hover:shadow-[inset_3px_0_0_rgb(var(--c-risk-solid))]",
  red: "hover:shadow-[inset_3px_0_0_rgb(var(--c-over-solid))]",
};
const ROW_ACTIVE = "bg-primary-soft shadow-[inset_3px_0_0_rgb(var(--c-primary))] hover:bg-primary-soft";

/* ---- Reordenar con FLIP (Web Animations) ---- */

function useFlip(order: string, containers: React.RefObject<HTMLElement>[]) {
  const prev = useRef<Map<string, number> | null>(null);
  useIsoLayoutEffect(() => {
    const els: HTMLElement[] = [];
    for (const c of containers) {
      c.current?.querySelectorAll<HTMLElement>(":scope > [data-employee-row]").forEach((el) => {
        if (el.getClientRects().length > 0) els.push(el);
      });
    }
    const next = new Map<string, number>();
    for (const el of els) next.set(el.dataset.employeeRow!, el.offsetTop);
    const before = prev.current;
    prev.current = next;
    if (!before || els.length > 60 || prefersReducedMotion()) return;
    for (const el of els) {
      const id = el.dataset.employeeRow!;
      const from = before.get(id);
      const to = next.get(id)!;
      try {
        if (from == null) {
          el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
        } else if (from !== to) {
          el.animate([{ transform: `translateY(${from - to}px)` }, { transform: "none" }], {
            duration: 250,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          });
        }
      } catch {
        /* sin Web Animations: el cambio es inmediato */
      }
    }
    // Solo cuando cambian las filas o su orden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);
}

/* ---- Componente ---- */

function SortHeader({
  label,
  k,
  sort,
  onSort,
  numeric,
  title,
}: {
  label: React.ReactNode;
  k: SortKey;
  sort: SortState;
  onSort: (s: SortState) => void;
  numeric?: boolean;
  title?: string;
}) {
  const active = sort.key === k;
  // Primer clic en una cifra: de mayor a menor; en un texto: A→Z.
  const firstDir: SortState["dir"] = k === "persona" || k === "area" ? "asc" : "desc";
  const nextDir = active ? (sort.dir === "asc" ? "desc" : "asc") : firstDir;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
      className={clsx(numeric ? "th-num" : "th", "p-0")}
      title={title}
    >
      <button
        type="button"
        onClick={() => onSort({ key: k, dir: nextDir })}
        className={clsx(
          "group inline-flex min-h-11 w-full items-center gap-1 px-4 py-2 transition-colors duration-fast hover:text-ink",
          numeric && "justify-end",
          active && "text-heading"
        )}
      >
        {label}
        <Icon
          name="chevron-up"
          className={clsx(
            "h-3.5 w-3.5 shrink-0 transition-[transform,opacity] duration-fast ease-move",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50",
            active && sort.dir === "desc" && "rotate-180"
          )}
        />
        <span className="sr-only">
          {active
            ? sort.dir === "asc"
              ? " (orden ascendente)"
              : " (orden descendente)"
            : " (ordenar)"}
        </span>
      </button>
    </th>
  );
}

export function EmployeeTable({
  rows,
  hrefBase,
  roleParam,
  query,
  sort: sortProp,
  onSortChange,
  emptyTitle = "Sin resultados",
  emptyText = "Ninguna persona coincide con los filtros de este periodo. Quite algún filtro para ampliar la búsqueda.",
  emptyActions,
}: {
  rows: EmployeeStatus[];
  /** Base para el enlace de detalle, p. ej. "/empleado" o "/demo/empleado". */
  hrefBase?: string;
  /** Rol a preservar en el enlace (demo). */
  roleParam?: string;
  /** Filtros vigentes, para volver al panel tal como estaba. */
  query?: string;
  /** Orden controlado (si se omite, la tabla lo guarda). */
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
  emptyTitle?: string;
  emptyText?: string;
  /** Botones del estado vacío (p. ej. «Limpiar búsqueda»). */
  emptyActions?: React.ReactNode;
}) {
  const drawer = useDrawer();
  const [ownSort, setOwnSort] = useState<SortState>(DEFAULT_SORT);
  const sort = sortProp ?? ownSort;
  const onSort = (s: SortState) => {
    if (!sortProp) setOwnSort(s);
    onSortChange?.(s);
  };

  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useFlip(sorted.map((r) => r.id).join("|"), [tbodyRef, listRef]);

  const activeId = drawer?.activeEmployeeId ?? null;

  const openRow = (e: React.MouseEvent<HTMLElement>, id: string) => {
    if (!drawer) return;
    // El enlace del nombre se maneja solo; aquí, el resto de la fila.
    if ((e.target as HTMLElement).closest("a, button")) return;
    drawer.open({ kind: "employee", id }, e.currentTarget.querySelector<HTMLElement>("a"));
  };
  const linkFor = (id: string) => {
    if (!hrefBase) return undefined;
    if (drawer) return drawer.fichaHref(id);
    const qs = [query, roleParam ? `rol=${roleParam}` : ""].filter(Boolean).join("&");
    return `${hrefBase}/${id}${qs ? `?${qs}` : ""}`;
  };

  // La meta a la fecha es la misma para todas las filas del periodo: va una
  // sola vez sobre la tabla en vez de repetirse en una columna.
  const targets = new Set(rows.map((r) => Math.round(r.target * 10)));
  const sharedTarget = targets.size === 1 ? rows[0].target : null;

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center px-4 py-8 text-center">
        <svg viewBox="0 0 120 72" className="h-16 w-28 text-brand dark:text-brand-300" aria-hidden focusable="false">
          <rect x="14" y="14" width="64" height="46" rx="8" fill="currentColor" opacity="0.1" />
          <path d="M24 28h36M24 38h28M24 48h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
          <path d="M92 8 112 42H72Z" fill="currentColor" opacity="0.16" />
          <circle cx="78" cy="44" r="12" fill="none" stroke="currentColor" strokeWidth="3.5" />
          <path d="m87 53 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p className="mt-3 text-ui font-semibold text-heading">{emptyTitle}</p>
        <p className="mt-1 max-w-[52ch] text-small text-ink-2">{emptyText}</p>
        {emptyActions && <div className="mt-4 flex flex-wrap justify-center gap-2">{emptyActions}</div>}
      </div>
    );
  }

  const name = (r: EmployeeStatus, cls: string) =>
    linkFor(r.id) ? (
      <EmployeeLink id={r.id} href={linkFor(r.id)} className={cls}>
        {r.name ?? r.code}
      </EmployeeLink>
    ) : (
      <span className={cls}>{r.name ?? r.code}</span>
    );

  const projection = (r: EmployeeStatus) => (
    <span className={r.willExceedMonthly ? "font-semibold text-risk" : "text-ink-2"}>
      ≈{fmtH(r.projectedMonthlyOvertime)}
    </span>
  );

  return (
    <div className="card overflow-hidden p-0">
      {sharedTarget != null && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5 text-small text-ink-2">
          <span>
            Meta a la fecha: <strong className="tabular-nums text-ink">{fmtH(sharedTarget)}</strong>
          </span>
          <span aria-hidden className="text-line-strong">·</span>
          <span>
            Límite del mes: <strong className="tabular-nums text-ink">{RULES.MONTHLY_OVERTIME_LIMIT}h</strong>
          </span>
        </p>
      )}

      {/* Teléfono: una tarjeta por persona. */}
      <ul ref={listRef} className="divide-y divide-line sm:hidden print:hidden">
        {sorted.map((r) => {
          const active = r.id === activeId;
          return (
            <li
              key={r.id}
              data-employee-row={r.id}
              aria-current={active ? "true" : undefined}
              onClick={(e) => openRow(e, r.id)}
              className={clsx(
                "px-4 py-3 transition-[background-color,box-shadow] duration-fast",
                drawer && "cursor-pointer active:bg-surface-2",
                active && ROW_ACTIVE
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {name(r, "relative block truncate text-ui text-heading underline-offset-2 after:absolute after:-inset-y-2 after:inset-x-0 hover:underline")}
                  <span className="block truncate text-small text-ink-2">
                    {r.code}
                    {r.area ? ` · ${r.area}` : ""}
                  </span>
                </div>
                <StatusBadge level={r.level} pending={r.pendingReviewCount} size="sm" className="justify-end" />
              </div>
              <dl className="mt-2.5 grid grid-cols-3 gap-2">
                <div>
                  <dt className="text-caption font-normal text-muted">Acumulado</dt>
                  <dd className={clsx("text-ui tabular-nums", accClass(r))}>{fmtH(r.monthlyOvertime)}</dd>
                </div>
                <div>
                  <dt className="text-caption font-normal text-muted">Sobre la meta</dt>
                  <dd className="text-ui tabular-nums">
                    {r.overTarget > 0 ? (
                      <span className="font-semibold text-risk">+{fmtH(r.overTarget)}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption font-normal text-muted">Proyección</dt>
                  <dd className="text-ui tabular-nums">{projection(r)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      {/* Escritorio: cabecera fija dentro de la zona desplazable. */}
      <div
        className="table-scroll hidden max-h-[min(70vh,46rem)] overflow-y-auto sm:block print:block print:max-h-none print:overflow-visible"
        role="region"
        aria-label="Detalle por empleado"
        tabIndex={0}
      >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 print:static bg-surface-2 shadow-[inset_0_-1px_0_rgb(var(--c-line))]">
            <tr>
              <SortHeader label="Estado" k="estado" sort={sort} onSort={onSort} title="Orden por gravedad" />
              <SortHeader label="Persona" k="persona" sort={sort} onSort={onSort} />
              <SortHeader label="Área · Jefe" k="area" sort={sort} onSort={onSort} />
              <SortHeader label="Acumulado" k="acumulado" sort={sort} onSort={onSort} numeric />
              {sharedTarget == null && (
                <th scope="col" className="th-num">Meta a la fecha</th>
              )}
              <SortHeader label="Sobre la meta" k="sobre" sort={sort} onSort={onSort} numeric />
              <SortHeader
                label={<>Sem. &gt; {RULES.WEEKLY_OVERTIME_LIMIT}h</>}
                k="semanas"
                sort={sort}
                onSort={onSort}
                numeric
                title={`Semanas de más de ${RULES.WEEKLY_OVERTIME_LIMIT}h (informativo)`}
              />
              <SortHeader label="Proyección" k="proyeccion" sort={sort} onSort={onSort} numeric />
            </tr>
          </thead>
          <tbody ref={tbodyRef} className="divide-y divide-line">
            {sorted.map((r) => {
              const active = r.id === activeId;
              return (
                <tr
                  key={r.id}
                  data-employee-row={r.id}
                  aria-current={active ? "true" : undefined}
                  onClick={(e) => openRow(e, r.id)}
                  className={clsx(
                    "transition-[background-color,box-shadow] duration-fast hover:bg-surface-2",
                    drawer && "cursor-pointer",
                    active ? ROW_ACTIVE : ROW_ACCENT[r.level]
                  )}
                >
                  <td className="px-4 py-3">
                    <StatusBadge level={r.level} pending={r.pendingReviewCount} />
                  </td>
                  <td className="min-w-[11rem] px-4 py-3">
                    {name(r, "font-semibold text-heading underline-offset-2 hover:underline")}
                    <div className="text-small text-ink-2">
                      {r.code}
                      {r.roleTitle ? ` · ${r.roleTitle}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    <span className="block max-w-[12rem] truncate" title={r.area ?? "—"}>
                      {r.area ?? "—"}
                    </span>
                    <span className="block max-w-[14rem] truncate text-small text-muted" title={r.managerName ?? "—"}>
                      {r.managerName ?? "—"}
                    </span>
                  </td>
                  <td className={clsx("whitespace-nowrap px-4 py-3 text-right tabular-nums", accClass(r))}>
                    {fmtH(r.monthlyOvertime)}
                  </td>
                  {sharedTarget == null && (
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink-2">
                      {fmtH(r.target)}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {r.overTarget > 0 ? (
                      <span className="font-semibold text-risk">+{fmtH(r.overTarget)}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink-2">
                    {r.highWeeksMonth > 0 ? r.highWeeksMonth : <span className="text-muted">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {projection(r)}
                    {r.risk === "proyeccion" && (
                      <span className="block text-caption text-risk">pasaría de 48h</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
