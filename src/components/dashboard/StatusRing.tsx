/**
 * Anillo del semáforo de la vista: Excedido, En riesgo y Normal como arcos
 * proporcionales, empezando arriba y en sentido horario. Es la única
 * representación gráfica del reparto por estado en el panel.
 *
 * - El SVG del servidor ya trae los arcos finales (sin JS se ve correcto).
 * - Al montar, cada arco se dibuja desde 0 con una animación CSS (700ms,
 *   escalonada 60ms, fill «backwards»): corre desde el primer pintado, sin
 *   esperar a la hidratación, y al terminar suelta el estilo (queda el valor
 *   final del atributo; si no corre, también).
 * - Al cambiar los datos (filtros), los arcos se transforman con una
 *   transición CSS de stroke-dasharray / stroke-dashoffset.
 * - Con movimiento reducido no se anima (--dur-chart y --dur-grow valen 0).
 */
const ORDER = [
  { key: "red", color: "var(--c-over-solid)" },
  { key: "yellow", color: "var(--c-risk-solid)" },
  { key: "green", color: "var(--c-ok-solid)" },
] as const;

export function StatusRing({
  counts,
  size = 128,
  stroke = 12,
  label,
  children,
}: {
  counts: Record<"red" | "yellow" | "green", number>;
  size?: number;
  stroke?: number;
  /** Nombre accesible del gráfico. */
  label: string;
  /** Contenido del centro (cifra total). */
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = counts.red + counts.yellow + counts.green;
  const nonZero = ORDER.filter((o) => counts[o.key] > 0).length;
  // Separación de 2px entre arcos (solo si hay más de uno).
  const gap = nonZero > 1 ? 2 + stroke * 0.15 : 0;

  let start = 0;
  const arcs = ORDER.map((o) => {
    const len = total > 0 ? (counts[o.key] / total) * c : 0;
    const visible = Math.max(0, len - gap);
    const arc = { ...o, len: visible, offset: -start };
    start += len;
    return arc;
  });

  const anim = `ring-draw-${Math.round(c)}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Solo el fotograma inicial: el final es el valor del atributo. */}
      <style>{`@keyframes ${anim}{from{stroke-dasharray:0 ${c}}}`}</style>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={label}
        className="print-exact block"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: "rgb(var(--c-chart-track))" }}
        />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map((a, i) => (
            <circle
              key={a.key}
              data-arc={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${a.len} ${c}`}
              strokeDashoffset={a.offset}
              style={{
                stroke: `rgb(${a.color})`,
                animation: `${anim} var(--dur-chart) var(--ease-enter) ${i * 60}ms backwards`,
                transition:
                  "stroke-dasharray var(--dur-grow) var(--ease-enter), stroke-dashoffset var(--dur-grow) var(--ease-enter)",
              }}
            />
          ))}
        </g>
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
