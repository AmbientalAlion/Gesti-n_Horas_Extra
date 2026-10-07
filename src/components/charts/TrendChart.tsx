"use client";

// Tendencia por tramo (serie única). Área + línea en el color de serie del
// tema (chart-1), puntos con etiqueta directa y tooltip al pasar, enfocar o
// tocar. Sin leyenda: el título nombra la serie.
//
// - El SVG se dibuja al ancho real (1 unidad = 1 px): el texto mide 11–12 px
//   en cualquier pantalla y las etiquetas de los extremos no se recortan.
// - Opcional por punto: `target` (marca punteada de la meta; si el valor la
//   supera, el punto pasa a triángulo naranja de En riesgo), `partial`
//   (tramo con menos días) y `future` (tramo sin datos todavía).

import { useId, useRef } from "react";
import clsx from "clsx";
import { useChartTooltip } from "./ChartTooltip";
import {
  EASE,
  HALO,
  fmt,
  markerPath,
  stagger,
  svgId,
  textWidth,
  useChartEntrance,
  useChartSize,
} from "./chart-utils";

export interface TrendPoint {
  label: string;
  value: number;
  /** Opcional: meta del tramo en la misma unidad que `value`. */
  target?: number;
  /** Opcional: tramo parcial (menos de 7 días). */
  partial?: boolean;
  /** Opcional: tramo que aún no tiene datos. */
  future?: boolean;
}

export function TrendChart({
  points,
  unit = "h",
}: {
  points: TrendPoint[];
  unit?: string;
}) {
  const uid = useId();
  const [boxRef, size] = useChartSize<HTMLDivElement>({ width: 320, height: 200 });
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useChartTooltip();

  const W = size.width;
  const H = size.height;
  const n = points.length;
  const anyPartial = points.some((p) => p.partial || p.future);
  const anyTarget = points.some((p) => p.target != null && !p.future);
  const padL = 14;
  const padR = 14;
  const padT = 24;
  const padB = anyPartial ? 40 : 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = Math.max(1, ...points.map((p) => Math.max(p.value, p.target ?? 0))) * 1.08;

  const x = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i * plotW) / (n - 1));
  const y = (v: number) => padT + plotH * (1 - v / max);

  const data = points.map((p, i) => ({ ...p, i })).filter((p) => !p.future);
  const linePts = data.map((p) => `${x(p.i)},${y(p.value)}`).join(" ");
  const lastData = data[data.length - 1];
  const areaPts =
    data.length > 1
      ? `${x(data[0].i)},${padT + plotH} ${linePts} ${x(lastData.i)},${padT + plotH}`
      : "";
  const grad = svgId(uid, "area");
  const isOver = (p: TrendPoint) => p.target != null && Math.round(p.value * 10) > Math.round(p.target * 10);

  useChartEntrance(
    svgRef,
    (root) => {
      const out: Animation[] = [];
      root.querySelectorAll<SVGElement>("[data-anim=line]").forEach((el) =>
        out.push(
          el.animate([{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }], {
            duration: 700,
            easing: EASE.enter,
          })
        )
      );
      root.querySelectorAll<SVGElement>("[data-anim=area]").forEach((el) =>
        out.push(
          el.animate(
            [
              { opacity: 0, transform: "translateY(6px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 300, delay: 120, easing: EASE.enter, fill: "backwards" }
          )
        )
      );
      root.querySelectorAll<SVGElement>("[data-anim=dot]").forEach((el, i) =>
        out.push(
          el.animate([{ transform: "scale(0.4)" }, { transform: "scale(1)" }], {
            duration: 280,
            delay: stagger(i),
            easing: EASE.pop,
            fill: "backwards",
          })
        )
      );
      return out;
    },
    size.measured
  );

  if (n === 0) {
    return <p className="py-6 text-center text-sm text-muted">Sin datos.</p>;
  }

  const anchorX = (i: number, label: string) => {
    const w = textWidth(label, 12);
    return Math.max(padL + w / 2 - 6, Math.min(x(i), W - padR - w / 2 + 6));
  };
  // Etiquetas del eje: sin el mes si no caben, y se omiten las que chocan
  // (su dato sigue en el tooltip y en el nombre accesible del punto).
  const short = n > 1 && plotW / (n - 1) < 84;
  const axisText = (l: string) => (short ? l.replace(/\s+\D+$/u, "") : l);
  const shownAxis = new Set<number>();
  let prevRight = -Infinity;
  points.forEach((p, i) => {
    const l = axisText(p.label);
    const sub = p.future ? "pendiente" : p.partial ? "parcial" : "";
    const w = Math.max(textWidth(l, 12), sub ? textWidth(sub, 11) : 0);
    const cx = anchorX(i, l);
    if (cx - w / 2 < prevRight + 8) return;
    shownAxis.add(i);
    prevRight = cx + w / 2;
  });

  return (
    <div ref={boxRef} className={clsx("relative h-[200px] w-full", anyTarget && "mb-7")}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="group"
        aria-roledescription="gráfico"
        aria-label={`Tendencia de horas extra por tramo: ${data
          .map((p) => `${p.label} ${fmt(p.value)}${unit}`)
          .join(", ")}`}
      >
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "rgb(var(--c-chart-1))", stopOpacity: 0.26 }} />
            <stop offset="100%" style={{ stopColor: "rgb(var(--c-chart-1))", stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>

        {/* Rejilla recesiva (base y mitad) */}
        <g aria-hidden>
          <line x1={padL} x2={W - padR} y1={padT + plotH / 2} y2={padT + plotH / 2} className="stroke-chart-grid" strokeDasharray="2 4" />
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} className="stroke-chart-axis" />
        </g>

        {areaPts && <polygon points={areaPts} fill={`url(#${grad})`} data-anim="area" aria-hidden />}
        {data.length > 1 && (
          <polyline
            points={linePts}
            fill="none"
            className="stroke-chart-1"
            strokeWidth={2.25}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            data-anim="line"
            aria-hidden
          />
        )}

        {points.map((p, i) => {
          const cx = x(i);
          const step = n > 1 ? plotW / (n - 1) : plotW;
          const over = isOver(p);
          const value = `${fmt(p.value)}${unit}`;
          const lines = p.future
            ? ["Sin datos todavía"]
            : [
                value,
                ...(p.target != null ? [`Meta del tramo ${fmt(p.target)}${unit}`] : []),
                ...(over ? ["Sobre la meta"] : []),
                ...(p.partial ? ["Tramo parcial: tiene menos días"] : []),
              ];
          const t = tip.bind(String(i), { title: p.label, lines, tone: over ? "risk" : "default" }, { touch: true });
          const cy = p.future ? padT + plotH : y(p.value);
          const vlw = textWidth(value, 12);
          return (
            <g
              key={i}
              tabIndex={0}
              role="img"
              aria-label={`${p.label}: ${lines.join(", ")}`}
              className="group outline-none"
              {...t}
            >
              <rect
                x={cx - Math.max(22, step / 2)}
                y={padT - 16}
                width={Math.max(44, step)}
                height={plotH + 16}
                fill="transparent"
              />
              {/* Meta del tramo: marca corta punteada */}
              {p.target != null && !p.future && (
                <line
                  x1={cx - 12}
                  x2={cx + 12}
                  y1={y(p.target)}
                  y2={y(p.target)}
                  className="stroke-chart-meta"
                  strokeWidth={2}
                  strokeDasharray="3 2"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={11}
                fill="none"
                className="stroke-focus opacity-0 transition-opacity duration-fast group-focus-visible:opacity-100"
                strokeWidth={2}
              />
              {p.future ? (
                <circle cx={cx} cy={cy} r={4} className="fill-surface stroke-chart-axis" strokeWidth={1.5} strokeDasharray="2 2" />
              ) : (
                <path
                  d={markerPath(over ? "yellow" : "green", cx, cy, 4.5)}
                  className={clsx(over ? "fill-risk-solid" : "fill-chart-1", "stroke-surface print-exact")}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  data-anim="dot"
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              )}
              {!p.future && (
                <text
                  x={Math.max(padL + vlw / 2 - 6, Math.min(cx, W - padR - vlw / 2 + 6))}
                  y={cy - 11}
                  textAnchor="middle"
                  className="fill-chart-label-strong tabular-nums"
                  style={{ fontSize: 12, fontWeight: 600, ...HALO }}
                >
                  {value}
                </text>
              )}
              {shownAxis.has(i) && (
                <text
                  x={anchorX(i, axisText(p.label))}
                  y={padT + plotH + 18}
                  textAnchor="middle"
                  className={p.future ? "fill-muted" : "fill-chart-label"}
                  style={{ fontSize: 12 }}
                >
                  {axisText(p.label)}
                </text>
              )}
              {shownAxis.has(i) && (p.partial || p.future) && (
                <text
                  x={anchorX(i, axisText(p.label))}
                  y={padT + plotH + 32}
                  textAnchor="middle"
                  className="fill-muted"
                  style={{ fontSize: 11 }}
                >
                  {p.future ? "pendiente" : "parcial"}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip.node}
      {anyTarget && (
        <p className="absolute -bottom-6 left-0 inline-flex items-center gap-1.5 text-caption text-ink-2">
          <span className="w-4 border-t-2 border-dashed border-chart-meta" aria-hidden /> Meta del tramo
        </p>
      )}
    </div>
  );
}
