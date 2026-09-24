// Tendencia temporal (serie única: horas extra por semana). Área + línea en
// Azul ALIÓN, puntos con etiqueta directa y <title>. Sin leyenda (título nombra
// la serie). Eje X con las semanas, rejilla recesiva.

export interface TrendPoint {
  label: string;
  value: number;
}

export function TrendChart({
  points,
  unit = "h",
}: {
  points: TrendPoint[];
  unit?: string;
}) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Sin datos.</p>;
  }

  const W = 320;
  const H = 180;
  const padL = 10;
  const padR = 12;
  const padT = 18;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = Math.max(...points.map((p) => p.value), 1);
  const n = points.length;

  const x = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i * plotW) / (n - 1));
  const y = (v: number) => padT + plotH * (1 - v / max);

  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPts = `${padL},${padT + plotH} ${linePts} ${padL + plotW},${padT + plotH}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-48 w-full"
      role="img"
      aria-label={`Tendencia de horas extra por semana: ${points
        .map((p) => `${p.label} ${p.value}${unit}`)
        .join(", ")}`}
    >
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0098BA" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0098BA" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Rejilla recesiva (línea base y media) */}
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={padL}
          x2={padL + plotW}
          y1={padT + plotH * f}
          y2={padT + plotH * f}
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth={1}
        />
      ))}
      <text x={padL} y={padT - 6} className="fill-slate-500" style={{ fontSize: 9 }}>
        máx {max}
        {unit}
      </text>

      {n > 1 && <polygon points={areaPts} fill="url(#trendFill)" />}
      {n > 1 && (
        <polyline
          points={linePts}
          fill="none"
          stroke="#0098BA"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4} fill="#0098BA" className="stroke-white dark:stroke-slate-900" strokeWidth={1.5}>
            <title>{`${p.label}: ${p.value}${unit}`}</title>
          </circle>
          <text
            x={x(i)}
            y={y(p.value) - 9}
            textAnchor="middle"
            className="fill-brand-dark"
            style={{ fontSize: 10, fontWeight: 600 }}
          >
            {p.value}
          </text>
          <text
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: 10 }}
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
