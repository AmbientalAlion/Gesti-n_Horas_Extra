"use client";

import { useDrawer, type Segment } from "../drawer/context";

// Dona de distribución (estado del semáforo). Colores de estado + leyenda con
// etiqueta y valor (identidad nunca solo por color).

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  /** Lista que se abre en el panel al tocar este estado. */
  segment?: Segment;
}

export function DonutChart({
  segments,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
}) {
  const drawer = useDrawer();
  const total = segments.reduce((a, s) => a + s.value, 0);
  const cx = 80;
  const cy = 80;
  const r = 60;
  const stroke = 22;
  const GAP = 1.2; // hueco de 2px aprox entre segmentos (en unidades de pathLength=100)

  let cumulative = 0;
  const arcs =
    total > 0
      ? segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const pct = (s.value / total) * 100;
            const seg = Math.max(0.001, pct - GAP);
            const arc = {
              color: s.color,
              dasharray: `${seg} ${100 - seg}`,
              dashoffset: -cumulative,
              title: `${s.label}: ${s.value} (${pct.toFixed(0)}%)`,
            };
            cumulative += pct;
            return arc;
          })
      : [];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 160 160"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label={`Distribución: ${segments
          .map((s) => `${s.label} ${s.value}`)
          .join(", ")}`}
      >
        {/* Pista base */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth={stroke}
          pathLength={100}
        />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              pathLength={100}
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
            >
              <title>{a.title}</title>
            </circle>
          ))}
        </g>
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-brand-dark"
          style={{ fontSize: 28, fontWeight: 700 }}
        >
          {total}
        </text>
        {centerLabel && (
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: 11 }}
          >
            {centerLabel}
          </text>
        )}
      </svg>

      <ul className="w-full space-y-1 text-sm">
        {segments.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <li key={s.label}>
              <button
                type="button"
                disabled={!drawer || !s.segment}
                onClick={() => s.segment && drawer?.open({ kind: "segment", segment: s.segment })}
                className="group flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left transition hover:bg-brand-tint disabled:cursor-default disabled:hover:bg-transparent"
                title={s.segment ? `Ver a las personas en estado ${s.label.toLowerCase()}` : undefined}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span className="text-slate-700">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums text-brand-dark">
                  {s.value}
                </span>
                <span className="w-10 text-right text-xs text-slate-500">
                  {pct.toFixed(0)}%
                </span>
                {s.segment && drawer && (
                  <span className="text-slate-400 transition group-hover:translate-x-0.5" aria-hidden>
                    ›
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
