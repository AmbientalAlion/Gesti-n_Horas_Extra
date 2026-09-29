"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useDrawer, type Segment } from "./drawer/context";
import { segmentMembers } from "./drawer/select";
import { fmtH, RULES } from "@/lib/overtime";
import type { EmployeeStatus } from "@/lib/aggregate";

type Tab = "red" | "yellow" | "weeklyHigh" | "errors";

const TABS: {
  key: Tab;
  label: string;
  /** Texto de la etiqueta de conteo: «2 excedidos», «1 en riesgo». */
  count: (n: number) => string;
  empty: string;
  accent: string;
  pill: string;
  dot: string;
}[] = [
  {
    key: "red",
    label: "Excedidos",
    count: (n) => `${n} excedido${n === 1 ? "" : "s"}`,
    empty: `Nadie superó las ${RULES.MONTHLY_OVERTIME_LIMIT} horas extra del mes.`,
    accent: "border-l-status-red",
    pill: "bg-red-100 text-red-800",
    dot: "bg-status-red",
  },
  {
    key: "yellow",
    label: "En riesgo",
    count: (n) => `${n} en riesgo`,
    empty: "Nadie va por encima de la meta ni proyecta superar el límite.",
    accent: "border-l-status-yellow",
    pill: "bg-amber-100 text-amber-800",
    dot: "bg-status-yellow",
  },
  {
    key: "weeklyHigh",
    label: `Semanas > ${RULES.WEEKLY_OVERTIME_LIMIT}h`,
    count: (n) => `${n} con semana > ${RULES.WEEKLY_OVERTIME_LIMIT}h`,
    empty: `Nadie pasó de ${RULES.WEEKLY_OVERTIME_LIMIT}h en una semana este mes.`,
    accent: "border-l-slate-400",
    pill: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  {
    key: "errors",
    label: "Por revisar",
    count: (n) => `${n} por revisar`,
    empty: "No hay registros congelados por horas huérfanas.",
    accent: "border-l-violet-500",
    pill: "bg-violet-100 text-violet-800",
    dot: "bg-violet-500",
  },
];

const VISIBLE = 8;

/** Una alerta: fila que se despliega con los motivos y las acciones. */
function AlertItem({
  s,
  tab,
  open,
  onToggle,
  delay = 0,
  reviewHref,
}: {
  s: EmployeeStatus;
  tab: (typeof TABS)[number];
  open: boolean;
  onToggle: () => void;
  delay?: number;
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

  return (
    <li
      style={{ animationDelay: `${delay}ms` }}
      className={clsx(
        "overflow-hidden rounded-lg border border-l-4 border-slate-200 transition-colors motion-safe:animate-fade-in-up",
        tab.accent,
        open ? "bg-slate-50" : "bg-white"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 sm:px-4"
      >
        <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", tab.dot)} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {s.name ?? s.code}
          </span>
          <span className="block truncate text-xs text-slate-600">
            {[s.area, s.managerName].filter(Boolean).join(" · ") || "—"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold tabular-nums text-slate-900">{value.main}</span>
          <span className="block text-[11px] text-slate-500">{value.sub}</span>
        </span>
        <span
          className={clsx(
            "shrink-0 text-slate-500 transition-transform duration-300",
            open ? "rotate-90" : ""
          )}
          aria-hidden
        >
          ›
        </span>
      </button>

      <div
        id={bodyId}
        ref={bodyRef}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-slate-200 px-3 py-3 sm:px-4">
            <p className="text-xs text-slate-600">
              Acumulado <strong className="tabular-nums text-slate-800">{fmtH(s.monthlyOvertime)}</strong>{" "}
              · meta a la fecha <span className="tabular-nums">{fmtH(s.target)}</span> · límite{" "}
              {RULES.MONTHLY_OVERTIME_LIMIT}h
            </p>

            {reasons.length > 0 && (
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700">
                    <span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tab.dot)} aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => drawer?.open({ kind: "employee", id: s.id })}
                className="btn-primary text-sm"
              >
                Ver detalle
              </button>
              {drawer && (
                <Link href={drawer.fichaHref(s.id)} className="btn-secondary text-sm">
                  Abrir ficha
                </Link>
              )}
              {tab.key === "errors" && reviewHref && (
                <Link href={reviewHref} className="btn-secondary text-sm">
                  Ir a revisar
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
 */
export function AlertsCenter({
  delay = 0,
  reviewHref,
}: {
  delay?: number;
  /** Enlace a la bandeja de registros por revisar (solo RRHH). */
  reviewHref?: string;
}) {
  const drawer = useDrawer();
  const statuses = drawer?.statuses;

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
  const firstWithData = (TABS.find((t) => lists[t.key].length > 0)?.key ?? "red") as Tab;

  const [open, setOpen] = useState(total > 0);
  const [tab, setTab] = useState<Tab>(firstWithData);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Si cambian los filtros y la pestaña queda vacía, salta a una con datos.
  useEffect(() => {
    if (lists[tab].length === 0) setTab(firstWithData);
  }, [lists, tab, firstWithData]);

  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  if (total === 0) {
    return (
      <section
        style={{ animationDelay: `${delay}ms` }}
        className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 motion-safe:animate-fade-in-up sm:px-5"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-status-green" aria-hidden />
        <p className="text-sm text-green-800">
          <strong>Sin alertas.</strong> Todas las personas de la vista van dentro de la
          meta, ninguna pasó de {RULES.WEEKLY_OVERTIME_LIMIT}h en una semana y no hay registros
          por revisar.
        </p>
      </section>
    );
  }

  const current = TABS.find((t) => t.key === tab)!;
  const items = lists[tab];

  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm motion-safe:animate-fade-in-up"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition hover:bg-brand-tint/60 sm:px-5 sm:py-4"
      >
        <span
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-dark transition-transform duration-300",
            open ? "rotate-90" : ""
          )}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-brand-dark">Centro de alertas</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">
            Toque una alerta para desplegar el motivo y las acciones.
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {TABS.map((t) =>
            lists[t.key].length > 0 ? (
              <span
                key={t.key}
                className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", t.pill)}
              >
                {t.count(lists[t.key].length)}
              </span>
            ) : null
          )}
        </span>
      </button>

      <div
        id={panelId}
        ref={panelRef}
        aria-hidden={!open}
        className={clsx(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
            {/* Pestañas por tipo de alerta */}
            <div role="tablist" aria-label="Tipo de alerta" className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.key}
                  onClick={() => {
                    setTab(t.key);
                    setExpanded(null);
                  }}
                  className={clsx(
                    "inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition",
                    tab === t.key
                      ? "bg-white text-brand-dark shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span className={clsx("h-2 w-2 rounded-full", t.dot)} aria-hidden />
                  {t.label}
                  <span className="tabular-nums text-slate-500">{lists[t.key].length}</span>
                </button>
              ))}
            </div>

            <div role="tabpanel" aria-label={current.label}>
              {items.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-600">{current.empty}</p>
              ) : (
                <ul className="space-y-2">
                  {items.slice(0, VISIBLE).map((s, i) => (
                    <AlertItem
                      key={`${tab}-${s.id}`}
                      s={s}
                      tab={current}
                      delay={i * 40}
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
                  onClick={() =>
                    drawer?.open({ kind: "segment", segment: tab as Segment })
                  }
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline underline-offset-2 hover:no-underline"
                >
                  Ver la lista completa ({items.length}) ›
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
