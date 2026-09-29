// Acumulado de la persona frente a la meta del mes (requerimientos v2).
//
// - Línea punteada: meta acumulada (12h por semana, proporcional en tramos
//   parciales, tope de 48h el día 28).
// - Línea azul: acumulado al final de cada tramo con datos (o a la fecha de
//   corte si el tramo va a medias).
// - Punto rojo: tramo que cierra por encima de la meta (En riesgo).
// - Línea gris: límite del mes (48h).
// No muestra margen ni «horas disponibles».

import type { SegmentPoint } from "@/lib/aggregate";
import { monthlyTarget, RULES } from "@/lib/overtime";

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export function CumulativeChart({
  segments,
  daysInMonth,
  cutoffDay,
  monthLabel,
}: {
  segments: SegmentPoint[];
  daysInMonth: number;
  cutoffDay: number;
  monthLabel: string;
}) {
  const limit = RULES.MONTHLY_OVERTIME_LIMIT;
  const W = 640;
  const H = 260;
  const left = 40;
  const right = W - 12;
  const y0 = 16;
  const bottom = H - 44;

  // Puntos del acumulado: inicio del mes y final de cada tramo con datos.
  const pts: { day: number; value: number; target: number; seg: SegmentPoint }[] = [];
  for (const s of segments) {
    if (s.future) break;
    const endDay = Math.min(daysInMonth, cutoffDay > 0 ? cutoffDay : daysInMonth);
    const segEnd = segmentEndDay(s, segments, daysInMonth);
    const day = Math.min(segEnd, endDay);
    pts.push({ day, value: s.cumulative, target: monthlyTarget(day), seg: s });
  }
  const maxVal = Math.max(limit + 6, ...pts.map((p) => p.value + 4));
  const x = (d: number) => left + (d / daysInMonth) * (right - left);
  const y = (v: number) => bottom - (v / maxVal) * (bottom - y0);

  const kink = Math.min(daysInMonth, 28);
  const metaPath = `M ${x(0)} ${y(0)} L ${x(kink)} ${y(monthlyTarget(kink))} L ${x(daysInMonth)} ${y(limit)}`;
  const accPath =
    `M ${x(0)} ${y(0)}` + pts.map((p) => ` L ${x(p.day)} ${y(p.value)}`).join("");
  const ticks = [0, 12, 24, 36, 48].filter((t) => t <= maxVal);
  const over = pts.filter((p) => Math.round(p.value * 10) > Math.round(p.target * 10)).length;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={
          pts.length === 0
            ? `Acumulado frente a la meta, ${monthLabel}: sin datos todavía`
            : `Acumulado frente a la meta, ${monthLabel}: lleva ${fmt(pts[pts.length - 1].value)}h; ` +
              `${over} de ${pts.length} tramos por encima de la meta`
        }
      >
        {/* Rejilla y eje Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={right} y1={y(t)} y2={y(t)} className="stroke-slate-200" />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
              {t}h
            </text>
          </g>
        ))}

        {/* Límite del mes */}
        <line x1={left} x2={right} y1={y(limit)} y2={y(limit)} className="stroke-slate-500" strokeWidth={1.5} />
        <text x={left + 4} y={y(limit) - 5} className="fill-slate-500 text-[11px]">
          Límite del mes: {limit}h
        </text>

        {/* Meta acumulada */}
        <path d={metaPath} fill="none" className="stroke-slate-400" strokeWidth={1.5} strokeDasharray="5 4" />

        {/* Acumulado */}
        {pts.length > 0 && (
          <path d={accPath} fill="none" className="stroke-brand" strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {pts.map((p) => {
          const isOver = Math.round(p.value * 10) > Math.round(p.target * 10);
          const labelBelow = p.value > limit - 6;
          return (
            <g key={p.seg.key}>
              <circle
                cx={x(p.day)}
                cy={y(p.value)}
                r={5}
                className={isOver ? "fill-status-red" : "fill-brand"}
              >
                <title>
                  {`${p.seg.label}: ${fmt(p.seg.hours)}h en el tramo · acumulado ${fmt(p.value)}h · meta ${fmt(p.target)}h`}
                </title>
              </circle>
              <text
                x={x(p.day)}
                y={labelBelow ? y(p.value) + 18 : y(p.value) - 10}
                textAnchor="middle"
                className="fill-slate-800 text-[11px] font-semibold"
              >
                {fmt(p.value)}h
              </text>
            </g>
          );
        })}

        {/* Eje X: tramos con su meta */}
        <line x1={left} x2={right} y1={bottom} y2={bottom} className="stroke-slate-300" />
        {segments.map((s) => {
          const end = segmentEndDay(s, segments, daysInMonth);
          const mid = end - s.days / 2;
          return (
            <g key={s.key}>
              <text x={x(mid)} y={bottom + 16} textAnchor="middle" className="fill-slate-700 text-[11px]">
                {s.short}
              </text>
              <text x={x(mid)} y={bottom + 30} textAnchor="middle" className="fill-slate-500 text-[10px]">
                meta {fmt(s.target)}h
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-brand" aria-hidden /> Acumulado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-slate-400" aria-hidden /> Meta (12h por semana, tope 48h)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-status-red" aria-hidden /> Tramo por encima de la meta
        </span>
      </figcaption>
    </figure>
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
