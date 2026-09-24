import type { HeatmapData } from "@/lib/aggregate";

// Mapa de calor área × semana (horas extra). Escala secuencial de un solo tono
// (Azul ALIÓN, claro→oscuro). Valor en cada celda + <title>.

function shade(value: number, max: number): { bg: string; fg: string } {
  if (max <= 0 || value <= 0) return { bg: "#f1f5f9", fg: "#64748b" };
  const t = Math.min(1, value / max);
  // Interpola de Azul 7% (#EBF7F9) a Azul ALIÓN oscuro (#036f88).
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = lerp(0xeb, 0x03);
  const g = lerp(0xf7, 0x6f);
  const b = lerp(0xf9, 0x88);
  const fg = t > 0.55 ? "#ffffff" : "#003865";
  return { bg: `rgb(${r},${g},${b})`, fg };
}

export function Heatmap({ data }: { data: HeatmapData }) {
  if (data.areas.length === 0 || data.weeks.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Sin datos.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="p-1 text-left text-[13px] font-semibold text-slate-600">Área</th>
            {data.weeks.map((w) => (
              <th key={w} className="p-1 text-center text-[13px] font-semibold text-slate-600">
                S{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.areas.map((area) => (
            <tr key={area}>
              <td className="whitespace-nowrap p-1 pr-3 text-xs text-slate-600">{area}</td>
              {data.weeks.map((w) => {
                const v = data.values[area]?.[w] ?? 0;
                const { bg, fg } = shade(v, data.max);
                return (
                  <td key={w} className="p-0">
                    <div
                      className="flex h-10 min-w-[42px] items-center justify-center rounded-md text-xs font-medium tabular-nums"
                      style={{ backgroundColor: bg, color: fg }}
                      title={`${area} · Semana ${w}: ${v.toFixed(1)}h extra`}
                    >
                      {v > 0 ? v.toFixed(0) : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Horas extra por área y semana · más oscuro = más horas
      </p>
    </div>
  );
}
