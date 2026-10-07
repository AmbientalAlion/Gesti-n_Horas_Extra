"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import type { SemaphoreLevel } from "@/lib/types";
import { LEVEL_TEXT, LevelIcon } from "../StatusBadge";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Icon } from "../ui/Icon";
import { useDrawer, type Segment } from "../drawer/context";
import { useChartTooltip } from "./ChartTooltip";
import { EASE, useChartEntrance } from "./chart-utils";

// Dona de distribución (estado del semáforo). Leyenda con forma de estado,
// etiqueta, valor y porcentaje: la identidad nunca depende solo del color.
//
// - Pista en chart-track y hueco entre segmentos: se ve igual en claro y en
//   oscuro. Si el segmento trae `level`, su color sale de los tokens de
//   estado (el `color` recibido queda como respaldo).
// - Entrada: la dona se llena por segmentos en un barrido (700 ms) y el total
//   del centro cuenta hasta su valor. Con movimiento reducido, estado final.
// - Pasar el ratón o enfocar una fila de la leyenda resalta su arco.

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  /** Opcional: estado del semáforo (forma y color de tokens). */
  level?: SemaphoreLevel;
  /** Lista que se abre en el panel al tocar este estado. */
  segment?: Segment;
}

const LEVEL_STROKE: Record<SemaphoreLevel, string> = {
  green: "stroke-ok-solid",
  yellow: "stroke-risk-solid",
  red: "stroke-over-solid",
};
const LEVEL_TONE = { green: "ok", yellow: "risk", red: "over" } as const;

export function DonutChart({
  segments,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
}) {
  const drawer = useDrawer();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hot, setHot] = useState<string | null>(null);
  const tip = useChartTooltip();
  const total = segments.reduce((a, s) => a + s.value, 0);
  const cx = 80;
  const cy = 80;
  const r = 60;
  const stroke = 20;
  const GAP = segments.filter((s) => s.value > 0).length > 1 ? 1.2 : 0; // hueco de ~2px

  let cumulative = 0;
  const arcs =
    total > 0
      ? segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const pct = (s.value / total) * 100;
            const len = Math.max(0.001, pct - GAP);
            const arc = { s, pct, len, start: cumulative };
            cumulative += pct;
            return arc;
          })
      : [];

  useChartEntrance(svgRef, (root) => {
    const out: Animation[] = [];
    const g = root.querySelector<SVGGElement>("[data-anim=ring]");
    if (g) {
      out.push(
        g.animate([{ transform: "rotate(-90deg)" }, { transform: "rotate(0deg)" }], {
          duration: 700,
          easing: EASE.enter,
        })
      );
    }
    root.querySelectorAll<SVGCircleElement>("[data-anim=arc]").forEach((el) => {
      const len = Number(el.dataset.len ?? 0);
      const start = Number(el.dataset.start ?? 0);
      // Un solo barrido continuo: cada arco empieza cuando llega el anterior.
      out.push(
        el.animate(
          [{ strokeDasharray: `0 100` }, { strokeDasharray: `${len} ${100 - len}` }],
          {
            duration: Math.max(160, 6 * len),
            delay: Math.min(150, start * 1.5),
            easing: EASE.enter,
            fill: "backwards",
          }
        )
      );
    });
    return out;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg
          ref={svgRef}
          viewBox="0 0 160 160"
          className="h-full w-full"
          role="img"
          aria-label={`Distribución: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}
        >
          <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-chart-track" strokeWidth={stroke} />
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <g data-anim="ring" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              {arcs.map((a) => {
                const dim = hot !== null && hot !== a.s.label;
                const t = tip.bind(
                  a.s.label,
                  {
                    title: a.s.label,
                    lines: [`${a.s.value} (${a.pct.toFixed(0)}%)`],
                    tone: a.s.level ? LEVEL_TONE[a.s.level] : "default",
                  },
                  { describe: false, touch: true }
                );
                return (
                  <circle
                    key={a.s.label}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    className={clsx(
                      a.s.level && LEVEL_STROKE[a.s.level],
                      "print-exact transition-[opacity,stroke-width] duration-fast ease-enter"
                    )}
                    style={{ stroke: a.s.level ? undefined : a.s.color }}
                    strokeWidth={hot === a.s.label ? stroke + 4 : stroke}
                    opacity={dim ? 0.4 : 1}
                    pathLength={100}
                    strokeDasharray={`${a.len} ${100 - a.len}`}
                    strokeDashoffset={-a.start}
                    data-anim="arc"
                    data-len={a.len}
                    data-start={a.start}
                    {...t}
                    onPointerEnter={(e) => {
                      setHot(a.s.label);
                      t.onPointerEnter(e);
                    }}
                    onPointerLeave={(e) => {
                      setHot(null);
                      t.onPointerLeave(e);
                    }}
                  />
                );
              })}
            </g>
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <AnimatedNumber value={total} className="text-display font-bold leading-none text-heading tabular-nums" />
          {centerLabel && <span className="mt-1 text-caption text-muted">{centerLabel}</span>}
        </div>
      </div>

      <ul className="w-full space-y-1 text-sm">
        {segments.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          const canOpen = !!(drawer && s.segment);
          return (
            <li key={s.label}>
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => s.segment && drawer?.open({ kind: "segment", segment: s.segment })}
                onPointerEnter={() => setHot(s.label)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(s.label)}
                onBlur={() => setHot(null)}
                className="group flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left transition duration-fast hover:bg-primary-soft active:scale-[0.99] disabled:cursor-default disabled:hover:bg-transparent disabled:active:scale-100"
                aria-label={
                  canOpen
                    ? `${s.label}: ${s.value} (${pct.toFixed(0)}%). Ver a las personas en este estado`
                    : undefined
                }
              >
                {s.level ? (
                  <span className={clsx("inline-flex", LEVEL_TEXT[s.level])} aria-hidden>
                    <LevelIcon level={s.level} className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-sm print-exact" style={{ backgroundColor: s.color }} aria-hidden />
                )}
                <span className="text-ink-2">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums text-heading">{s.value}</span>
                <span className="w-10 text-right text-xs tabular-nums text-muted">{pct.toFixed(0)}%</span>
                {canOpen && (
                  <Icon
                    name="chevron-right"
                    className="h-4 w-4 text-muted transition-transform duration-fast group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {tip.node}
    </div>
  );
}
