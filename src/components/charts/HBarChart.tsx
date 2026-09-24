"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { SemaphoreLevel } from "@/lib/types";

// Barras horizontales para magnitud (un solo tono: Azul ALIÓN). Etiqueta directa
// del valor + <title> nativo. Punto de estado opcional. Si se pasa `drill`, al
// tocar una barra se aplica ese filtro global (drill-down) conservando el resto.

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
  drill,
}: {
  items: HBarItem[];
  unit?: string;
  color?: string;
  /** Si se define, tocar una barra fija `param`=label (y limpia `clear`). */
  drill?: { param: string; clear?: string[] };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Sin datos.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  const drillTo = (label: string) => {
    if (!drill) return;
    const next = new URLSearchParams(params.toString());
    next.set(drill.param, label);
    for (const c of drill.clear ?? []) next.delete(c);
    startTransition(() => router.push(`?${next.toString()}`, { scroll: false }));
  };

  return (
    <ul
      className={clsx("space-y-3.5 transition-opacity", isPending && "opacity-60")}
      aria-busy={isPending}
    >
      {items.map((it) => {
        const pct = Math.max(2, (it.value / max) * 100);
        const clickable = !!it.href || !!drill;

        const header = (
          <div className="mb-1.5 flex items-center gap-2">
            {it.level && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: DOT[it.level] }}
                aria-hidden
              />
            )}
            <span
              className="min-w-0 flex-1 truncate leading-snug text-slate-700"
              title={it.label}
            >
              {it.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-brand-dark">
              {it.value.toFixed(1)}
              {unit}
            </span>
          </div>
        );

        const bar = (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${it.label}: ${it.value.toFixed(1)}${unit}`}
            />
          </div>
        );

        const sub = it.sublabel ? (
          <div className="mb-1.5 truncate text-xs text-slate-500" title={it.sublabel}>
            {it.sublabel}
          </div>
        ) : null;

        const body = (
          <>
            {header}
            {sub}
            {bar}
          </>
        );

        return (
          <li key={it.label} className="text-sm">
            {it.href ? (
              <Link
                href={it.href}
                className="block rounded-lg p-1 -m-1 transition hover:bg-brand-tint"
              >
                {body}
              </Link>
            ) : drill ? (
              <button
                type="button"
                onClick={() => drillTo(it.label)}
                className="block w-full rounded-lg p-1 -m-1 text-left transition hover:bg-brand-tint"
                title={`Ver el panel filtrado por “${it.label}”`}
              >
                {body}
              </button>
            ) : (
              <div>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
