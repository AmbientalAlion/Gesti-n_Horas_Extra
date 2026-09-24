"use client";

import clsx from "clsx";
import { useDrawer, type Segment } from "./drawer/context";

const TONES = {
  default: "text-slate-900",
  red: "text-status-red",
  yellow: "text-status-yellow",
} as const;

/**
 * Indicador del panel. Al tocarlo se abre a la derecha la lista de personas
 * que lo componen.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  segment,
  delay = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof TONES;
  segment: Segment;
  /** Retraso de la animación de entrada (ms), para escalonar las tarjetas. */
  delay?: number;
}) {
  const drawer = useDrawer();

  return (
    <button
      type="button"
      onClick={() => drawer?.open({ kind: "segment", segment })}
      style={{ animationDelay: `${delay}ms` }}
      className="card group flex flex-col text-left transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 motion-safe:animate-fade-in-up"
    >
      <span className="text-xs leading-snug text-slate-600 sm:text-sm">{label}</span>
      <span className={clsx("mt-1 text-2xl font-semibold tabular-nums leading-tight sm:text-3xl", TONES[tone])}>
        {value}
      </span>
      {hint && <span className="pt-1 text-xs text-slate-500">{hint}</span>}
      <span className="mt-auto pt-2 text-xs font-medium text-brand-dark opacity-70 transition group-hover:opacity-100">
        Ver lista ›
      </span>
    </button>
  );
}
