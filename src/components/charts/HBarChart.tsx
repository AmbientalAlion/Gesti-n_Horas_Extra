"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { SemaphoreLevel } from "@/lib/types";
import { useDrawer, type GroupDim } from "../drawer/context";
import { groupView } from "../drawer/views";

// Barras horizontales para magnitud (un solo tono: Azul ALIÓN). Etiqueta directa
// del valor + <title> nativo. Punto de estado opcional. Al tocar una barra se
// abre el detalle en el panel lateral (grupo o persona); sin panel, se filtra
// el tablero (drill-down) o se navega a la ficha.

const DOT: Record<SemaphoreLevel, string> = {
  green: "#16a34a",
  yellow: "#FF8400",
  red: "#dc2626",
};

const PARAM_DIM: Record<string, GroupDim> = {
  area: "area",
  planta: "planta",
  direccion: "direccion",
  jefe: "jefe",
};

export interface HBarItem {
  label: string;
  value: number;
  sublabel?: string;
  level?: SemaphoreLevel;
  href?: string;
  /** Si es una persona, su id (abre su detalle en el panel). */
  employeeId?: string;
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
  /** Barras de grupo: dimensión (`param`) y filtros dependientes a limpiar. */
  drill?: { param: string; clear?: string[] };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const drawer = useDrawer();
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Sin datos.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  const openGroup = (label: string) => {
    if (!drill) return;
    const dim = PARAM_DIM[drill.param];
    if (drawer && dim) {
      drawer.open(groupView(dim, label));
      return;
    }
    const next = new URLSearchParams(params.toString());
    next.set(drill.param, label);
    for (const c of drill.clear ?? []) next.delete(c);
    startTransition(() => router.push(`?${next.toString()}`, { scroll: false }));
  };

  return (
    <ul
      className={clsx("space-y-2 transition-opacity", isPending && "opacity-60")}
      aria-busy={isPending}
    >
      {items.map((it, i) => {
        const pct = Math.max(2, (it.value / max) * 100);

        const body = (
          <>
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
              <span
                className="shrink-0 text-slate-400 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
              >
                ›
              </span>
            </div>
            {it.sublabel && (
              <div className="mb-1.5 truncate text-xs text-slate-500" title={it.sublabel}>
                {it.sublabel}
              </div>
            )}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full origin-left rounded-full motion-safe:animate-grow-x"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  animationDelay: `${i * 60}ms`,
                }}
                title={`${it.label}: ${it.value.toFixed(1)}${unit}`}
              />
            </div>
          </>
        );

        const itemClass =
          "group block w-full rounded-lg px-1.5 py-1 text-left transition hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

        return (
          <li key={it.label} className="-mx-1.5 text-sm">
            {it.employeeId && drawer ? (
              <Link
                href={it.href ?? drawer.fichaHref(it.employeeId)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  drawer.open({ kind: "employee", id: it.employeeId! });
                }}
                className={itemClass}
                title={`Ver el detalle de ${it.label}`}
              >
                {body}
              </Link>
            ) : it.href ? (
              <Link href={it.href} className={itemClass}>
                {body}
              </Link>
            ) : drill ? (
              <button
                type="button"
                onClick={() => openGroup(it.label)}
                className={itemClass}
                title={`Ver el detalle de «${it.label}»`}
              >
                {body}
              </button>
            ) : (
              <div className="px-1.5 py-1">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
