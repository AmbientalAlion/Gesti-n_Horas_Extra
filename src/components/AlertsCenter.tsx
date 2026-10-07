"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useDrawer, type Segment } from "./drawer/context";
import { segmentMembers } from "./drawer/select";
import { LevelIcon, PendingIcon } from "./StatusBadge";
import { Icon } from "./ui/Icon";
import { prefersReducedMotion } from "./ui/useReducedMotion";
import { fmtH, RULES } from "@/lib/overtime";
import type { EmployeeStatus } from "@/lib/aggregate";

type Tab = "red" | "yellow" | "weeklyHigh" | "errors";

interface TabDef {
  key: Tab;
  label: string;
  /** Texto de la etiqueta de conteo: «2 excedidos», «1 en riesgo». */
  count: (n: number) => string;
  empty: string;
  accent: string;
  pill: string;
  icon: React.ReactNode;
  bullet: string;
}

const TABS: Record<Tab, TabDef> = {
  red: {
    key: "red",
    label: "Excedidos",
    count: (n) => `${n} excedido${n === 1 ? "" : "s"}`,
    empty: `Nadie superó las ${RULES.MONTHLY_OVERTIME_LIMIT} horas extra del mes.`,
    accent: "border-l-over-solid",
    pill: "chip-over",
    icon: <LevelIcon level="red" className="h-3 w-3 text-over-solid" />,
    bullet: "bg-over-solid",
  },
  yellow: {
    key: "yellow",
    label: "En riesgo",
    count: (n) => `${n} en riesgo`,
    empty: "Nadie va por encima de la meta ni proyecta superar el límite.",
    accent: "border-l-risk-solid",
    pill: "chip-risk",
    icon: <LevelIcon level="yellow" className="h-3 w-3 text-risk-solid" />,
    bullet: "bg-risk-solid",
  },
  weeklyHigh: {
    key: "weeklyHigh",
    label: `Semanas > ${RULES.WEEKLY_OVERTIME_LIMIT}h`,
    count: (n) => `${n} con semana > ${RULES.WEEKLY_OVERTIME_LIMIT}h`,
    empty: `Nadie pasó de ${RULES.WEEKLY_OVERTIME_LIMIT}h en una semana este mes.`,
    accent: "border-l-info-solid",
    pill: "chip-info",
    icon: <Icon name="calendar" className="h-3.5 w-3.5 text-info" />,
    bullet: "bg-info-solid",
  },
  errors: {
    key: "errors",
    label: "Por revisar",
    count: (n) => `${n} por revisar`,
    empty: "No hay registros congelados por horas huérfanas.",
    accent: "border-l-pending-solid",
    pill: "chip-pending",
    icon: <PendingIcon className="h-3.5 w-3.5 text-pending" />,
    bullet: "bg-pending-solid",
  },
};

/**
 * Orden de las pestañas según el rol: para RRHH «Por revisar» es una tarea
 * propia y va antes de lo informativo; para los demás roles es un aviso y
 * va al final.
 */
const ORDER: Record<"rrhh" | "otros", Tab[]> = {
  rrhh: ["red", "yellow", "errors", "weeklyHigh"],
  otros: ["red", "yellow", "weeklyHigh", "errors"],
};

const VISIBLE = 8;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Una alerta: fila que se despliega con los motivos y las acciones. */
function AlertItem({
  s,
  tab,
  open,
  onToggle,
  index,
  reviewHref,
}: {
  s: EmployeeStatus;
  tab: TabDef;
  open: boolean;
  onToggle: () => void;
  index: number;
  reviewHref?: string;
}) {
  const drawer = useDrawer();
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  const reasons =
    tab.key === "errors"
      ? [
          `Tiene ${s.pendingReviewCount} registro${s.pendingReviewCount === 1 ? "" : "s"} con un turno de más de ${RULES.ORPHAN_SHIFT_HOURS} horas sin marcación de salida.`,
          "Está congelado: no suma al acumulado hasta que Recursos Humanos lo revise.",
        ]
      : tab.key === "weeklyHigh"
        ? s.highWeeks.map((w) => `${w.label}: ${fmtH(w.hours)} (lunes a domingo${w.shared ? ", semana compartida con otro mes" : ""}).`)
        : s.reasons;
  const value =
    tab.key === "yellow"
      ? s.risk === "meta"
        ? { main: `+${fmtH(s.overTarget)}`, sub: "sobre la meta" }
        : { main: `≈${fmtH(s.projectedMonthlyOvertime)}`, sub: "al cierre" }
      : tab.key === "weeklyHigh"
        ? { main: String(s.highWeeksMonth || s.highWeeks.length), sub: `sem. > ${RULES.WEEKLY_OVERTIME_LIMIT}h` }
        : { main: fmtH(s.monthlyOvertime), sub: "en el mes" };
  // Reincidente: dos o más semanas de más de 12h en el mes.
  const reincidente = tab.key === "weeklyHigh" && s.highWeeksMonth >= 2;

  return (
    <li
      style={{ "--i": index } as React.CSSProperties}
      className={clsx(
        "reveal overflow-hidden rounded-control border border-l-4 border-line transition-[background-color,box-shadow] duration-fast",
        tab.accent,
        open ? "bg-surface-2 shadow-1" : "bg-surface"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="group flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-fast hover:bg-surface-2 active:bg-surface-3 sm:px-4"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-ui font-semibold text-ink">{s.name ?? s.code}</span>
            {reincidente && <span className="chip-info shrink-0">Reincidente</span>}
          </span>
          <span className="block truncate text-caption font-normal text-ink-2">
            {[s.area, s.managerName].filter(Boolean).join(" · ") || "—"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-ui font-bold tabular-nums text-ink">{value.main}</span>
          <span className="block text-[11px] leading-4 text-muted">{value.sub}</span>
        </span>
        <Icon
          name="chevron-down"
          className={clsx(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-[240ms] ease-move group-hover:text-ink-2",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        id={bodyId}
        ref={bodyRef}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows]",
          open
            ? "grid-rows-[1fr] duration-[280ms] ease-enter"
            : "grid-rows-[0fr] delay-[40ms] duration-[220ms] ease-exit"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={clsx(
              "space-y-3 border-t border-line px-3 py-3 transition-[opacity,transform] sm:px-4",
              open
                ? "translate-y-0 opacity-100 delay-[60ms] duration-[200ms] ease-enter"
                : "-translate-y-1 opacity-0 duration-[120ms] ease-exit"
            )}
          >
            <p className="text-caption font-normal text-ink-2">
              Acumulado <strong className="tabular-nums text-ink">{fmtH(s.monthlyOvertime)}</strong>{" "}
              · meta a la fecha <span className="tabular-nums">{fmtH(s.target)}</span> · límite{" "}
              {RULES.MONTHLY_OVERTIME_LIMIT}h
            </p>

            {reasons.length > 0 && (
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-small text-ink-2">
                    <span className={clsx("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", tab.bullet)} aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => drawer?.open({ kind: "employee", id: s.id })}
                className="btn-primary btn-sm"
              >
                Ver detalle
              </button>
              {drawer && (
                <Link href={drawer.fichaHref(s.id)} className="btn-secondary btn-sm">
                  Abrir ficha
                </Link>
              )}
              {tab.key === "errors" && reviewHref && (
                <Link href={reviewHref} className="btn-secondary btn-sm">
                  Ir a revisar
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Centro de alertas: cada alerta es una fila desplegable, agrupada en cuatro
 * pestañas (excedidos, en riesgo, semanas de más de 12h y por revisar).
 *
 * Pestañas con el patrón WAI-ARIA completo (flechas, Inicio/Fin, tabindex
 * itinerante, aria-controls / aria-labelledby). La pestaña activa se marca
 * con un indicador que se desliza (240ms, --ease-move); al cambiar, la
 * altura del panel se interpola y las filas entran escalonadas (≤150ms).
 */
export function AlertsCenter({
  reviewHref,
  role,
}: {
  /** Obsoleto. */
  delay?: number;
  /** Enlace a la bandeja de registros por revisar (solo RRHH). */
  reviewHref?: string;
  role?: string;
}) {
  const drawer = useDrawer();
  const statuses = drawer?.statuses;
  const order = ORDER[role === "rrhh" || role === "demo" ? "rrhh" : "otros"];

  const lists = useMemo(() => {
    const all = statuses ?? [];
    return {
      red: segmentMembers(all, "red"),
      yellow: segmentMembers(all, "yellow"),
      weeklyHigh: segmentMembers(all, "weeklyHigh"),
      errors: segmentMembers(all, "errors"),
    };
  }, [statuses]);
  const total =
    lists.red.length + lists.yellow.length + lists.weeklyHigh.length + lists.errors.length;
  const firstWithData = order.find((k) => lists[k].length > 0) ?? order[0];

  const [open, setOpen] = useState(total > 0);
  const [tab, setTab] = useState<Tab>(firstWithData);
  const [expanded, setExpanded] = useState<string | null>(null);
  const base = useId().replace(/:/g, "");
  const regionId = `${base}-region`;
  const panelId = `${base}-panel`;
  const tabId = (k: Tab) => `${base}-tab-${k}`;
  const regionRef = useRef<HTMLDivElement>(null);
  const tabpanelRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const prevHeight = useRef<number | null>(null);
  const [hasIndicator, setHasIndicator] = useState(false);
  const placed = useRef(false);

  // Si cambian los filtros y la pestaña queda vacía, salta a una con datos.
  useEffect(() => {
    if (lists[tab].length === 0 && lists[firstWithData].length > 0) setTab(firstWithData);
  }, [lists, tab, firstWithData]);

  useEffect(() => {
    regionRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  // Indicador deslizante: se coloca sobre la pestaña activa (y se recoloca
  // si cambia el tamaño del tablist: rotación, fuente, 2×2 ↔ fila).
  const placeIndicator = useCallback(() => {
    const el = tabRefs.current[tab];
    const ind = indicatorRef.current;
    if (!el || !ind) return;
    // La primera vez se coloca sin transición (no debe «volar» desde 0,0).
    const first = !placed.current;
    if (first) ind.style.transition = "none";
    ind.style.width = `${el.offsetWidth}px`;
    ind.style.height = `${el.offsetHeight}px`;
    ind.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
    if (first) {
      void ind.getBoundingClientRect();
      ind.style.transition = "";
      placed.current = true;
    }
    setHasIndicator(true);
  }, [tab]);

  useIsoLayoutEffect(() => {
    placeIndicator();
  }, [placeIndicator, lists]);

  useEffect(() => {
    const list = tablistRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => placeIndicator());
    ro.observe(list);
    return () => ro.disconnect();
  }, [placeIndicator]);

  // Altura del panel: de la anterior a la nueva al cambiar de pestaña.
  useIsoLayoutEffect(() => {
    const el = tabpanelRef.current;
    const from = prevHeight.current;
    prevHeight.current = null;
    if (!el || from == null || prefersReducedMotion() || typeof el.animate !== "function") return;
    const to = el.offsetHeight;
    if (Math.abs(to - from) < 2) return;
    try {
      el.style.overflow = "hidden";
      const a = el.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: 240,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      });
      const done = () => {
        el.style.overflow = "";
      };
      a.onfinish = done;
      a.oncancel = done;
    } catch {
      el.style.overflow = "";
    }
  }, [tab]);

  const select = (k: Tab, focus = false) => {
    if (k === tab) return;
    prevHeight.current = tabpanelRef.current?.offsetHeight ?? null;
    setTab(k);
    setExpanded(null);
    if (focus) tabRefs.current[k]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = order.indexOf(tab);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % order.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + order.length) % order.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = order.length - 1;
    if (next == null) return;
    e.preventDefault();
    select(order[next], true);
  };

  if (total === 0) {
    return (
      <section
        id="alertas"
        className="reveal flex items-center gap-3 rounded-card border border-ok-border bg-ok-soft px-4 py-3 sm:px-5"
      >
        <Icon name="check-circle" className="h-5 w-5 shrink-0 text-ok" />
        <p className="text-small text-ok">
          <strong>Sin alertas.</strong> Todas las personas de la vista van dentro de la
          meta, ninguna pasó de {RULES.WEEKLY_OVERTIME_LIMIT}h en una semana y no hay registros
          por revisar.
        </p>
      </section>
    );
  }

  const current = TABS[tab];
  const items = lists[tab];
  const withData = order.filter((k) => lists[k].length > 0);

  return (
    <section
      id="alertas"
      aria-labelledby={`${base}-title`}
      className="reveal card overflow-hidden p-0 sm:p-0"
    >
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={regionId}
          className="group flex min-h-14 w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition-colors duration-fast hover:bg-surface-2 active:bg-surface-3 sm:px-5 sm:py-4"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-heading transition-colors duration-fast group-hover:bg-surface-3"
            aria-hidden
          >
            <Icon
              name="chevron-down"
              strokeWidth={2.25}
              className={clsx(
                "h-4 w-4 transition-transform duration-[240ms] ease-move",
                open ? "rotate-0" : "-rotate-90"
              )}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span id={`${base}-title`} className="block text-title text-heading">
              Centro de alertas
            </span>
            <span className="mt-0.5 block text-small font-normal text-ink-2">
              Toque una alerta para ver el motivo y las acciones.
            </span>
          </span>
          {/* Resumen solo cuando está plegado: abierto, las pestañas ya lo dicen. */}
          <span
            aria-hidden={open}
            className={clsx(
              "flex flex-wrap gap-1.5 transition-opacity duration-fast",
              open ? "invisible opacity-0" : "visible opacity-100"
            )}
          >
            <span className="chip-brand font-semibold tabular-nums sm:hidden">
              {withData.length} tipo{withData.length === 1 ? "" : "s"} de alerta
            </span>
            {withData.map((k) => (
              <span key={k} className={clsx(TABS[k].pill, "hidden font-semibold tabular-nums sm:inline-flex")}>
                {TABS[k].count(lists[k].length)}
              </span>
            ))}
          </span>
        </button>
      </h2>

      <div
        id={regionId}
        ref={regionRef}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows]",
          open
            ? "grid-rows-[1fr] duration-[280ms] ease-enter"
            : "grid-rows-[0fr] delay-[40ms] duration-[220ms] ease-exit"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={clsx(
              "border-t border-line px-4 py-4 transition-opacity sm:px-5",
              open ? "opacity-100 delay-[60ms] duration-[200ms]" : "opacity-0 duration-[120ms]"
            )}
          >
            {/* Pestañas por tipo de alerta: 2×2 en el teléfono, una fila desde sm. */}
            <div
              ref={tablistRef}
              role="tablist"
              aria-label="Tipo de alerta"
              onKeyDown={onKeyDown}
              className="relative mb-4 grid grid-cols-2 gap-1 rounded-control bg-surface-3 p-1 sm:flex"
            >
              <span
                ref={indicatorRef}
                aria-hidden
                className={clsx(
                  "pointer-events-none absolute left-0 top-0 rounded-chip bg-surface shadow-1 transition-[transform,width,height] duration-base ease-move",
                  !hasIndicator && "opacity-0"
                )}
              />
              {order.map((k) => {
                const t = TABS[k];
                const selected = tab === k;
                const n = lists[k].length;
                return (
                  <button
                    key={k}
                    ref={(el) => {
                      tabRefs.current[k] = el;
                    }}
                    id={tabId(k)}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={panelId}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => select(k)}
                    className={clsx(
                      "relative z-[1] inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-chip px-2.5 text-ui transition-colors duration-fast sm:min-h-10 sm:px-3",
                      selected
                        ? "font-semibold text-heading"
                        : "text-ink-2 hover:bg-surface/50 hover:text-ink",
                      !hasIndicator && selected && "bg-surface shadow-1"
                    )}
                  >
                    {t.icon}
                    <span className="truncate">{t.label}</span>
                    <span
                      className={clsx(
                        "min-w-[1.5rem] rounded-full px-1.5 text-center text-caption tabular-nums",
                        selected ? "bg-surface-3 text-ink" : "text-muted",
                        n === 0 && "opacity-70"
                      )}
                    >
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              ref={tabpanelRef}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId(tab)}
              tabIndex={0}
              className="rounded-control"
            >
              {items.length === 0 ? (
                <p key={`${tab}-vacio`} className="animate-fade-in py-6 text-center text-small text-ink-2">
                  {current.empty}
                </p>
              ) : (
                <ul key={tab} className="space-y-2">
                  {items.slice(0, VISIBLE).map((s, i) => (
                    <AlertItem
                      key={s.id}
                      s={s}
                      tab={current}
                      index={i}
                      reviewHref={reviewHref}
                      open={expanded === s.id}
                      onToggle={() => setExpanded((e) => (e === s.id ? null : s.id))}
                    />
                  ))}
                </ul>
              )}

              {items.length > VISIBLE && (
                <button
                  type="button"
                  onClick={() => drawer?.open({ kind: "segment", segment: tab as Segment })}
                  className="btn-ghost btn-sm mt-3"
                >
                  Ver la lista completa ({items.length})
                  <Icon name="arrow-right" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
