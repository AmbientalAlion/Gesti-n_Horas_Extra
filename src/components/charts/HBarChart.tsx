import Link from "next/link";
import type { SemaphoreLevel } from "@/lib/types";

// Barras horizontales para magnitud (un solo tono: Azul ALIÓN). Etiqueta directa
// del valor al final de cada barra + <title> nativo. Punto de estado opcional.

const DOT: Record<SemaphoreLevel, string> = {
  green: "#16a34a",
  yellow: "#FF8400",
  red: "#dc2626",
};

export interface HBarItem {
  label: string;
  value: number;
  sublabel?: string;
  level?: SemaphoreLevel;
  href?: string;
}

export function HBarChart({
  items,
  unit = "h",
  color = "#0098BA",
}: {
  items: HBarItem[];
  unit?: string;
  color?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Sin datos.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const pct = Math.max(2, (it.value / max) * 100);
        const labelEl = it.href ? (
          <Link href={it.href} className="text-slate-700 hover:text-brand hover:underline">
            {it.label}
          </Link>
        ) : (
          <span className="text-slate-700">{it.label}</span>
        );
        return (
          <li key={it.label} className="text-sm">
            <div className="mb-1 flex items-center gap-2">
              {it.level && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: DOT[it.level] }}
                  aria-hidden
                />
              )}
              {labelEl}
              {it.sublabel && (
                <span className="text-xs text-slate-400">{it.sublabel}</span>
              )}
              <span className="ml-auto font-semibold tabular-nums text-brand-dark">
                {it.value.toFixed(1)}
                {unit}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
                title={`${it.label}: ${it.value.toFixed(1)}${unit}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
