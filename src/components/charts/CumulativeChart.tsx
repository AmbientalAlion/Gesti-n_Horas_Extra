"use client";

// Acumulado de la persona frente a la meta del mes (requerimientos v2).
//
// - Línea punteada: meta acumulada (12h por semana, proporcional en tramos
//   parciales, tope de 48h el día 28).
// - Línea azul: acumulado al final de cada tramo con datos (o a la fecha de
//   corte si el tramo va a medias).
// - Marcadores con la gramática del semáforo: círculo dentro de la meta,
//   triángulo naranja sobre la meta (En riesgo) y rombo rojo por encima de
//   48h (Excedido). El rojo solo significa Excedido.
// - Sombreado naranja SOLO entre la curva y la meta donde el acumulado la
//   supera. Nunca se sombrea ni se rotula el espacio bajo la meta: no se
//   muestran márgenes ni «horas disponibles».
// - Línea del límite del mes (48h), fecha de corte y zona sin datos.
//
// El SVG se dibuja al tamaño real del contenedor (1 unidad = 1 px), así el
// texto mide siempre 11–12 px, en el teléfono, en el panel y en escritorio.

import { useId, useRef } from "react";
import clsx from "clsx";
import type { SegmentPoint } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";
import { monthlyTarget, RULES } from "@/lib/overtime";
import { useChartTooltip } from "./ChartTooltip";
import {
  EASE,
  HALO,
  LEVEL_FILL,
  fmt,
  markerPath,
  stagger,
  svgId,
  textWidth,
  useChartEntrance,
  useChartSize,
} from "./chart-utils";

interface Pt {
  day: number;
  value: number;
  target: number;
  seg: SegmentPoint;
  level: SemaphoreLevel;
}

export function CumulativeChart({
  segments,
  daysInMonth,
  cutoffDay,
  monthLabel,
  projection,
  potential,
}: {
  segments: SegmentPoint[];
  daysInMonth: number;
  cutoffDay: number;
  monthLabel: string;
  /** Opcional: cierre proyectado del mes (se dibuja punteado hasta el último día). */
  projection?: number | null;
  /** Opcional: acumulado si se validan los registros por revisar. */
  potential?: number | null;
}) {
  const limit = RULES.MONTHLY_OVERTIME_LIMIT;
  const uid = useId();
  const [boxRef, size] = useChartSize<HTMLDivElement>({ width: 640, height: 260 });
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useChartTooltip();

  const W = size.width;
  const H = size.height;
  const narrow = W < 420;
  const left = 36;
  const right = W - (narrow ? 10 : 14);
  const top = 22;
  const bottom = H - (narrow ? 26 : 42);

  // Puntos del acumulado: final de cada tramo con datos.
  const endDay = Math.min(daysInMonth, cutoffDay > 0 ? cutoffDay : daysInMonth);
  const pts: Pt[] = [];
  for (const s of segments) {
    if (s.future) break;
    const day = Math.min(segmentEndDay(s, segments, daysInMonth), endDay);
    const target = monthlyTarget(day);
    const level: SemaphoreLevel =
      s.cumulative > limit
        ? "red"
        : Math.round(s.cumulative * 10) > Math.round(target * 10)
          ? "yellow"
          : "green";
    pts.push({ day, value: s.cumulative, target, seg: s, level });
  }
  const last = pts[pts.length - 1];
  const showProjection =
    projection != null && last != null && last.day < daysInMonth && projection > last.value + 0.05;
  const showPotential = potential != null && last != null && potential > last.value + 0.05;

  const maxVal = Math.max(
    limit + 6,
    ...pts.map((p) => p.value + 4),
    showProjection ? projection! + 4 : 0,
    showPotential ? potential! + 4 : 0
  );
  const x = (d: number) => left + (d / daysInMonth) * (right - left);
  const y = (v: number) => bottom - (v / maxVal) * (bottom - top);

  const kink = Math.min(daysInMonth, 28);
  const metaPath = `M ${x(0)} ${y(0)} L ${x(kink)} ${y(monthlyTarget(kink))} L ${x(daysInMonth)} ${y(limit)}`;
  const accPath = `M ${x(0)} ${y(0)}` + pts.map((p) => ` L ${x(p.day)} ${y(p.value)}`).join("");
  const ticks = (narrow ? [0, 24, 48] : [0, 12, 24, 36, 48]).filter((t) => t <= maxVal);
  const overCount = pts.filter((p) => p.level !== "green").length;
  const anyRed = pts.some((p) => p.level === "red");

  // Zonas en las que el acumulado supera la meta (solo por encima).
  const overAreas = overRegions(pts).map(
    (r) =>
      `M ${r.map((p) => `${x(p.d)} ${y(p.a)}`).join(" L ")} L ${r
        .slice()
        .reverse()
        .map((p) => `${x(p.d)} ${y(p.m)}`)
        .join(" L ")} Z`
  );

  const hasCutoff = cutoffDay > 0 && cutoffDay < daysInMonth;
  const hatch = svgId(uid, "sin-datos");

  // Etiquetas de valor: en pantallas angostas solo la última y las que
  // están sobre la meta; nunca dos encimadas.
  const labelled = new Set<number>();
  let prevX = -Infinity;
  pts.forEach((p, i) => {
    const isLast = i === pts.length - 1;
    if (narrow && !isLast && p.level === "green") return;
    if (x(p.day) - prevX < 40 && !isLast) return;
    if (isLast && x(p.day) - prevX < 40 && labelled.size > 0) {
      labelled.delete(Math.max(...Array.from(labelled)));
    }
    labelled.add(i);
    prevX = x(p.day);
  });

  useChartEntrance(
    svgRef,
    (root) => {
      const out: Animation[] = [];
      const q = (sel: string) => Array.from(root.querySelectorAll<SVGElement>(sel));
      for (const el of q("[data-anim=line]")) {
        out.push(
          el.animate([{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }], {
            duration: 700,
            easing: EASE.enter,
          })
        );
      }
      for (const el of q("[data-anim=fade]")) {
        out.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "linear" }));
      }
      for (const el of q("[data-anim=area]")) {
        out.push(
          el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 300,
            delay: 150,
            easing: "linear",
            fill: "backwards",
          })
        );
      }
      q("[data-anim=dot]").forEach((el, i) => {
        out.push(
          el.animate([{ transform: "scale(0.4)" }, { transform: "scale(1)" }], {
            duration: 280,
            delay: stagger(i),
            easing: EASE.pop,
            fill: "backwards",
          })
        );
      });
      // Un solo «latido» en los puntos sobre la meta, cuando la línea llega.
      for (const el of q("[data-anim=ring]")) {
        const at = Number(el.dataset.at ?? 1);
        out.push(
          el.animate(
            [
              { opacity: 0.55, transform: "scale(1)" },
              { opacity: 0, transform: "scale(2.6)" },
            ],
            { duration: 600, delay: 120 + 600 * at, easing: EASE.enter }
          )
        );
      }
      return out;
    },
    size.measured
  );

  const summary =
    pts.length === 0
      ? `Acumulado frente a la meta, ${monthLabel}: sin datos todavía`
      : `Acumulado frente a la meta, ${monthLabel}: lleva ${fmt(last!.value)}h ` +
        `con meta a la fecha de ${fmt(last!.target)}h; ${overCount} de ${pts.length} tramos por encima de la meta` +
        (anyRed ? `; pasó el límite de ${limit}h` : "");

  const axisLabel = (s: SegmentPoint) =>
    narrow && W / Math.max(1, segments.length) < 84 ? s.short.replace(/\s+\D+$/u, "") : s.short;

  // Etiquetas del eje X sin recortes ni choques: se omiten las que no caben
  // (tramos parciales muy cortos); su dato sigue en el tooltip del punto.
  const axisSlots: { s: SegmentPoint; label: string; cx: number }[] = [];
  let prevRight = -Infinity;
  for (const s of segments) {
    const end = segmentEndDay(s, segments, daysInMonth);
    const label = axisLabel(s);
    const w = textWidth(label, 12);
    const cx = Math.max(left + w / 2, Math.min(x(end - s.days / 2), right - w / 2));
    if (cx - w / 2 < prevRight + 8) continue;
    axisSlots.push({ s, label, cx });
    prevRight = cx + w / 2;
  }
  const anyYellow = pts.some((p) => p.level === "yellow");

  // La etiqueta de la proyección no debe pisar la del último punto.
  let projBelow = false;
  if (showProjection && last) {
    const projText = `≈${fmt(projection!)}h al cierre`;
    const pRight = x(daysInMonth) - 6;
    const pLeft = pRight - textWidth(projText, 12);
    const pTop = y(projection!) - 21;
    const lw = textWidth(`${fmt(last.value)}h`, 12);
    const lLeft = x(last.day) - lw / 2 - 4;
    const lRight = x(last.day) + lw / 2 + 4;
    const lBelow = last.value > limit - 6 || y(last.value) - 12 < top + 2;
    const lTop = lBelow ? y(last.value) + 9 : y(last.value) - 24;
    const hOverlap = pLeft < lRight && pRight > lLeft;
    const vOverlap = Math.abs(pTop - lTop) < 16;
    projBelow = (hOverlap && vOverlap) || y(projection!) - 21 < 0;
    if (projBelow && y(projection!) + 19 > bottom - 2) projBelow = false;
  }

  return (
    <figure>
      <div ref={boxRef} className="relative h-[220px] w-full sm:h-[260px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          role="group"
          aria-roledescription="gráfico"
          aria-label={summary}
        >
          <defs>
            <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" className="stroke-chart-grid" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Zona sin datos (después del corte) */}
          {hasCutoff && (
            <rect
              x={x(cutoffDay)}
              y={top}
              width={Math.max(0, right - x(cutoffDay))}
              height={bottom - top}
              fill={`url(#${hatch})`}
              opacity={0.7}
              aria-hidden
            />
          )}

          {/* Rejilla y eje Y */}
          <g aria-hidden>
            {ticks.map((t) => (
              <g key={t}>
                {t > 0 && <line x1={left} x2={right} y1={y(t)} y2={y(t)} className="stroke-chart-grid" />}
                <text
                  x={left - 8}
                  y={y(t) + 4}
                  textAnchor="end"
                  className="fill-chart-label tabular-nums"
                  style={{ fontSize: 11 }}
                >
                  {t}h
                </text>
              </g>
            ))}
          </g>

          {/* Límite del mes */}
          <g aria-hidden data-anim="fade">
            <line
              x1={left}
              x2={right}
              y1={y(limit)}
              y2={y(limit)}
              className="stroke-chart-limit"
              strokeWidth={1.5}
            />
            <text
              x={left + 6}
              y={y(limit) - 6}
              className="fill-chart-limit"
              style={{ fontSize: 12, fontWeight: 600, ...HALO }}
            >
              {narrow ? `Límite ${limit}h` : `Límite del mes: ${limit}h`}
            </text>
          </g>

          {/* Meta acumulada */}
          <path
            d={metaPath}
            fill="none"
            className="stroke-chart-meta"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            data-anim="fade"
            aria-hidden
          />

          {/* Fecha de corte */}
          {hasCutoff && (
            <g aria-hidden>
              <line
                x1={x(cutoffDay)}
                x2={x(cutoffDay)}
                y1={top}
                y2={bottom}
                className="stroke-chart-axis"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            </g>
          )}

          {/* Sobre la meta: solo el área entre la curva y la meta */}
          {overAreas.map((d, i) => (
            <path key={i} d={d} className="fill-risk-solid/20" data-anim="area" aria-hidden />
          ))}

          {/* Proyección a su ritmo */}
          {showProjection && (
            <g aria-hidden data-anim="area">
              <line
                x1={x(last!.day)}
                y1={y(last!.value)}
                x2={x(daysInMonth)}
                y2={y(projection!)}
                className={projection! > limit ? "stroke-risk-solid" : "stroke-chart-1"}
                strokeWidth={1.75}
                strokeDasharray="3 4"
                strokeLinecap="round"
                opacity={0.85}
              />
              <circle
                cx={x(daysInMonth)}
                cy={y(projection!)}
                r={3.5}
                className={clsx("stroke-surface", projection! > limit ? "fill-risk-solid" : "fill-chart-1")}
                strokeWidth={1.5}
              />
              <text
                x={x(daysInMonth) - 6}
                y={projBelow ? y(projection!) + 19 : y(projection!) - 9}
                textAnchor="end"
                className={projection! > limit ? "fill-risk" : "fill-chart-label-strong"}
                style={{ fontSize: 12, fontWeight: 600, ...HALO }}
              >
                ≈{fmt(projection!)}h al cierre
              </text>
            </g>
          )}

          {/* Por revisar: hasta dónde llegaría si se validan los registros */}
          {showPotential && (
            <g aria-hidden data-anim="area">
              <line
                x1={x(last!.day)}
                x2={x(last!.day)}
                y1={y(last!.value)}
                y2={y(potential!)}
                className="stroke-pending-solid"
                strokeWidth={2}
                strokeDasharray="1 3"
                strokeLinecap="round"
              />
              <line
                x1={x(last!.day) - 5}
                x2={x(last!.day) + 5}
                y1={y(potential!)}
                y2={y(potential!)}
                className="stroke-pending-solid"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text
                x={x(last!.day) + (x(last!.day) > right - 120 ? -8 : 8)}
                y={y(potential!) + 4}
                textAnchor={x(last!.day) > right - 120 ? "end" : "start"}
                className="fill-pending"
                style={{ fontSize: 11, fontWeight: 600, ...HALO }}
              >
                hasta {fmt(potential!)}h si se valida
              </text>
            </g>
          )}

          {/* Acumulado */}
          {pts.length > 0 && (
            <path
              d={accPath}
              fill="none"
              className="stroke-chart-1"
              strokeWidth={2.5}
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1"
              data-anim="line"
              aria-hidden
            />
          )}

          {/* Puntos (enfocables, con tooltip) */}
          {pts.map((p, i) => {
            const cx = x(p.day);
            const cy = y(p.value);
            const labelBelow = p.value > limit - 6 || cy - 12 < top + 2;
            const status =
              p.level === "red"
                ? `Más de ${limit}h (Excedido)`
                : p.level === "yellow"
                  ? "Sobre la meta (En riesgo)"
                  : "Dentro de la meta";
            const lines = [
              `${fmt(p.seg.hours)}h en el tramo`,
              `Acumulado ${fmt(p.value)}h`,
              `Meta a la fecha ${fmt(p.target)}h`,
              status,
            ];
            if (p.seg.pending) lines.push("Con registros por revisar");
            const t = tip.bind(p.seg.key, {
              title: p.seg.label,
              lines,
              tone: p.level === "red" ? "over" : p.level === "yellow" ? "risk" : "default",
            }, { touch: true });
            const lw = textWidth(`${fmt(p.value)}h`, 12);
            const lx = Math.max(left + lw / 2, Math.min(cx, right - lw / 2));
            return (
              <g
                key={p.seg.key}
                tabIndex={0}
                role="img"
                aria-label={`${p.seg.label}: ${lines.join(", ")}`}
                className="group cursor-default outline-none"
                {...t}
              >
                <circle cx={cx} cy={cy} r={18} fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={11}
                  fill="none"
                  className="stroke-focus opacity-0 transition-opacity duration-fast group-focus-visible:opacity-100"
                  strokeWidth={2}
                />
                {p.level !== "green" && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="none"
                    className={p.level === "red" ? "stroke-over-solid" : "stroke-risk-solid"}
                    strokeWidth={2}
                    opacity={0}
                    data-anim="ring"
                    data-at={last ? p.day / last.day : 1}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                )}
                <path
                  d={markerPath(p.level, cx, cy, 5)}
                  className={clsx(LEVEL_FILL[p.level], "stroke-surface print-exact")}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  data-anim="dot"
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
                {labelled.has(i) && (
                  <text
                    x={lx}
                    y={labelBelow ? cy + 21 : cy - 12}
                    textAnchor="middle"
                    className="fill-chart-label-strong tabular-nums"
                    style={{ fontSize: 12, fontWeight: 600, ...HALO }}
                  >
                    {fmt(p.value)}h
                  </text>
                )}
              </g>
            );
          })}

          {/* Eje X: tramos con su meta acumulada */}
          <g aria-hidden>
            <line x1={left} x2={right} y1={bottom} y2={bottom} className="stroke-chart-axis" />
            {axisSlots.map(({ s, label, cx }) => {
              return (
                <g key={s.key}>
                  <text
                    x={cx}
                    y={bottom + 17}
                    textAnchor="middle"
                    className={s.future ? "fill-muted" : "fill-chart-label"}
                    style={{ fontSize: 12 }}
                  >
                    {label}
                  </text>
                  {!narrow && (
                    <text
                      x={cx}
                      y={bottom + 32}
                      textAnchor="middle"
                      className="fill-muted"
                      style={{ fontSize: 11 }}
                    >
                      meta {fmt(s.target)}h
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {tip.node}

      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-small text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[3px] w-5 rounded-full bg-chart-1 print-exact" aria-hidden /> Acumulado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-chart-meta" aria-hidden /> Meta (12h por semana, tope{" "}
          {limit}h)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-chart-limit" aria-hidden /> Límite del mes
        </span>
        {anyYellow && (
          <span className="inline-flex items-center gap-1.5">
            <LegendMarker level="yellow" /> Sobre la meta (En riesgo)
          </span>
        )}
        {anyRed && (
          <span className="inline-flex items-center gap-1.5">
            <LegendMarker level="red" /> Más de {limit}h (Excedido)
          </span>
        )}
        {hasCutoff && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 border-l border-dashed border-chart-axis" aria-hidden />
            <span className="relative -ml-1 h-3 w-3 bg-[repeating-linear-gradient(45deg,rgb(var(--c-chart-grid))_0_2px,transparent_2px_4px)] print-exact" aria-hidden />
            Corte día {cutoffDay} · sin datos después
          </span>
        )}
        {showProjection && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dotted border-chart-1" aria-hidden /> Proyección a su ritmo
          </span>
        )}
        {showPotential && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 border-l-2 border-dotted border-pending-solid" aria-hidden /> Por revisar
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function LegendMarker({ level }: { level: SemaphoreLevel }) {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 shrink-0 print-exact" aria-hidden focusable="false">
      <path d={markerPath(level, 7, 7.5, 4.5)} className={LEVEL_FILL[level]} />
    </svg>
  );
}

/** Día del mes en que termina un tramo (acumulando los días de los anteriores). */
function segmentEndDay(s: SegmentPoint, all: SegmentPoint[], daysInMonth: number): number {
  let day = 0;
  for (const x of all) {
    day += x.days;
    if (x.key === s.key) return Math.min(day, daysInMonth);
  }
  return daysInMonth;
}

/**
 * Tramos en los que la curva del acumulado queda por encima de la meta.
 * Devuelve polígonos (d = día, a = acumulado, m = meta) que se cierran
 * en los cruces, para sombrear solo lo que está sobre la meta.
 */
function overRegions(pts: Pt[]): { d: number; a: number; m: number }[][] {
  if (pts.length === 0) return [];
  const nodes = [{ d: 0, v: 0 }, ...pts.map((p) => ({ d: p.day, v: p.value }))];
  const lastDay = nodes[nodes.length - 1].d;
  const acc = (d: number) => {
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      if (d <= b.d) return b.d === a.d ? b.v : a.v + ((b.v - a.v) * (d - a.d)) / (b.d - a.d);
    }
    return nodes[nodes.length - 1].v;
  };
  const xs = Array.from(new Set([...nodes.map((n) => n.d), ...(28 < lastDay ? [28] : [])])).sort(
    (a, b) => a - b
  );
  const EPS = 0.05;
  const regions: { d: number; a: number; m: number }[][] = [];
  let cur: { d: number; a: number; m: number }[] | null = null;
  for (let i = 0; i < xs.length; i++) {
    const d = xs[i];
    const a = acc(d);
    const m = monthlyTarget(d);
    const diff = a - m;
    if (i > 0) {
      const pd = xs[i - 1];
      const pa = acc(pd);
      const pdiff = pa - monthlyTarget(pd);
      if (pdiff > EPS !== diff > EPS && Math.abs(pdiff - diff) > 1e-9) {
        const t = Math.min(1, Math.max(0, pdiff / (pdiff - diff)));
        const cd = pd + (d - pd) * t;
        const cv = pa + (a - pa) * t;
        if (cur) {
          cur.push({ d: cd, a: cv, m: cv });
          regions.push(cur);
          cur = null;
        } else {
          cur = [{ d: cd, a: cv, m: cv }];
        }
      }
    }
    if (diff > EPS) (cur ??= []).push({ d, a, m });
  }
  if (cur) regions.push(cur);
  return regions.filter((r) => r.length >= 2);
}
