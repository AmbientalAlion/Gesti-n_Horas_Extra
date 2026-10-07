"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { SemaphoreLevel } from "@/lib/types";
import { LEVEL_LABELS, LEVEL_TEXT, LevelIcon } from "../StatusBadge";
import { Icon } from "../ui/Icon";
import { useDrawer, type GroupDim } from "../drawer/context";
import { groupView } from "../drawer/views";
import { useChartTooltip } from "./ChartTooltip";
import { EASE, fmt, stagger, useChartEntrance } from "./chart-utils";

// Barras horizontales de magnitud. Grupos (área, planta, dirección): un solo
// tono de serie (chart-1). Personas con `level`: la barra toma el relleno de
// su estado (Normal azul, En riesgo naranja, Excedido rojo) y lleva la forma
// del estado delante del nombre: el color nunca va solo.
//
// Movimiento: al verse por primera vez las barras se revelan desde la base
// (clip-path, así conservan el extremo redondeado) escalonadas hasta 150 ms;
// al filtrar, el ancho se reacomoda con transición en lugar de saltar.
// Al tocar una barra se abre el detalle en el panel lateral (grupo o
// persona); sin panel, se filtra el tablero o se navega a la ficha.

const PARAM_DIM: Record<string, GroupDim> = {
  area: "area",
  planta: "planta",
  direccion: "direccion",
  jefe: "jefe",
};

const LEVEL_BAR: Record<SemaphoreLevel, string> = {
  green: "bg-chart-1",
  yellow: "bg-risk-solid",
  red: "bg-over-solid",
};

const LEVEL_TONE = { green: "default", yellow: "risk", red: "over" } as const;

export interface HBarItem {
  label: string;
  value: number;
  sublabel?: string;
  level?: SemaphoreLevel;
  href?: string;
  /** Si es una persona, su id (abre su detalle en el panel). */
  employeeId?: string;
}

export function HBarChart({
  items,
  unit = "h",
  color,
  drill,
  marks,
}: {
  items: HBarItem[];
  unit?: string;
  /** Color de la barra (por defecto el de serie del tema). Ignorado si el ítem trae `level`. */
  color?: string;
  /** Barras de grupo: dimensión (`param`) y filtros dependientes a limpiar. */
  drill?: { param: string; clear?: string[] };
  /**
   * Opcional: líneas de referencia verticales (p. ej., meta a la fecha y
   * límite de 48h). Fijan una escala común y nunca rotulan la diferencia.
   */
  marks?: { value: number; label: string; tone?: "meta" | "limit" }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const drawer = useDrawer();
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLUListElement>(null);
  const tip = useChartTooltip();

  useChartEntrance(listRef, (root) =>
    Array.from(root.querySelectorAll<HTMLElement>("[data-anim=bar]")).map((el, i) =>
      el.animate(
        [{ clipPath: "inset(0 100% 0 0 round 999px)" }, { clipPath: "inset(0 0 0 0 round 999px)" }],
        { duration: 700, delay: stagger(i, 40), easing: EASE.enter, fill: "backwards" }
      )
    )
  );

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Sin datos.</p>;
  }
  const markMax = marks && marks.length > 0 ? Math.max(...marks.map((m) => m.value)) * 1.12 : 0;
  const max = Math.max(1, markMax, ...items.map((i) => i.value));
  const pctOf = (v: number) => Math.min(100, (v / max) * 100);

  const openGroup = (label: string) => {
    if (!drill) return;
    const dim = PARAM_DIM[drill.param];
    if (drawer && dim) {
      drawer.open(groupView(dim, label));
      return;
    }
    const next = new URLSearchParams(params.toString());
    next.set(drill.param, label);
    for (const c of drill.clear ?? []) next.delete(c);
    startTransition(() => router.push(`?${next.toString()}`, { scroll: false }));
  };

  const itemClass =
    "group block w-full rounded-control px-2 py-1.5 text-left transition duration-fast ease-enter hover:bg-primary-soft active:scale-[0.99] motion-reduce:active:scale-100";

  return (
    <div className="relative">
      {marks && marks.length > 0 && (
        <div className="pointer-events-none mb-1 h-4 text-[11px] font-semibold text-chart-label" aria-hidden>
          <div className="relative mx-2 h-full">
            {marks.map((m) => (
              <span
                key={m.label}
                className={clsx(
                  "absolute top-0 -translate-x-1/2 whitespace-nowrap",
                  m.tone === "limit" ? "text-over" : "text-chart-label"
                )}
                style={{ left: `${pctOf(m.value)}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <ul
        ref={listRef}
        className={clsx(
          "space-y-1.5 transition-opacity duration-fast",
          isPending && "opacity-60"
        )}
        aria-busy={isPending}
      >
        {items.map((it) => {
          const pct = Math.max(2, pctOf(it.value));
          const valueText = `${fmt(it.value)}${unit}`;

          const body = (
            <>
              <div className="mb-1 flex items-center gap-2">
                {it.level && (
                  <span className={clsx("inline-flex", LEVEL_TEXT[it.level])}>
                    <LevelIcon level={it.level} />
                    <span className="sr-only">{LEVEL_LABELS[it.level]}:</span>
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium leading-snug text-ink">{it.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-heading">{valueText}</span>
                {(drill || it.href || it.employeeId) && (
                  <Icon
                    name="chevron-right"
                    className="hover-reveal h-4 w-4 shrink-0 text-muted group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                  />
                )}
              </div>
              {it.sublabel && <div className="mb-1.5 truncate text-caption text-muted">{it.sublabel}</div>}
              <div className="relative h-2.5 w-full rounded-full bg-chart-track print-exact">
                <div
                  className={clsx(
                    "h-full rounded-full print-exact transition-[width] duration-[450ms] ease-move motion-reduce:transition-none",
                    it.level ? LEVEL_BAR[it.level] : !color && "bg-chart-1"
                  )}
                  style={{ width: `${pct}%`, backgroundColor: it.level ? undefined : color }}
                  data-anim="bar"
                />
                {marks?.map((m) => (
                  <span
                    key={m.label}
                    className={clsx(
                      "absolute -inset-y-1 w-0",
                      m.tone === "limit"
                        ? "border-l-2 border-over-solid"
                        : "border-l border-dashed border-chart-limit/70"
                    )}
                    style={{ left: `${pctOf(m.value)}%` }}
                    aria-hidden
                  />
                ))}
              </div>
            </>
          );

          const tipProps = tip.bind(
            it.label,
            {
              title: it.label,
              lines: [
                valueText,
                ...(it.level ? [LEVEL_LABELS[it.level]] : []),
                ...(it.sublabel ? [it.sublabel] : []),
              ],
              tone: it.level ? LEVEL_TONE[it.level] : "default",
            },
            { describe: false }
          );

          return (
            <li key={it.label} className="-mx-2 text-sm">
              {it.employeeId && drawer ? (
                <Link
                  href={it.href ?? drawer.fichaHref(it.employeeId)}
                  prefetch={false}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    tip.hide();
                    drawer.open({ kind: "employee", id: it.employeeId! });
                  }}
                  className={itemClass}
                  aria-label={`${it.label}: ${valueText}${it.level ? `, ${LEVEL_LABELS[it.level]}` : ""}. Ver el detalle`}
                  {...tipProps}
                >
                  {body}
                </Link>
              ) : it.href ? (
                <Link href={it.href} prefetch={false} className={itemClass} {...tipProps}>
                  {body}
                </Link>
              ) : drill ? (
                <button
                  type="button"
                  onClick={() => {
                    tip.hide();
                    openGroup(it.label);
                  }}
                  className={itemClass}
                  aria-label={`${it.label}: ${valueText}${it.sublabel ? `, ${it.sublabel}` : ""}. Ver el detalle`}
                  {...tipProps}
                >
                  {body}
                </button>
              ) : (
                <div className="px-2 py-1.5" {...tipProps}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {tip.node}
    </div>
  );
}
