"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { FilterOptions, Filters } from "@/lib/aggregate";

const KEYS = ["planta", "direccion", "area", "ceco", "jefe"];

// Al cambiar un filtro más amplio, se limpian los dependientes para no dejar
// selecciones incoherentes (p. ej. una planta nueva con un área de otra sede).
const DEPENDENTS: Record<string, string[]> = {
  planta: ["direccion", "area", "ceco", "jefe"],
  direccion: ["area", "ceco", "jefe"],
  area: ["ceco"],
  ceco: ["area"],
  jefe: [],
};

const LABELS: Record<string, string> = {
  planta: "Planta",
  direccion: "Dirección",
  area: "Área",
  ceco: "Centro de costo",
  jefe: "Jefe",
};

export function DashboardFilters({
  options,
  current,
}: {
  options: FilterOptions;
  current: Filters;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const go = (next: URLSearchParams) => {
    startTransition(() => router.push(`?${next.toString()}`, { scroll: false }));
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    for (const dep of DEPENDENTS[key] ?? []) next.delete(dep);
    go(next);
  };

  const clearOne = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    go(next);
  };

  const clearAll = () => {
    const next = new URLSearchParams(params.toString());
    KEYS.forEach((k) => next.delete(k));
    go(next);
  };

  const activos: { key: string; value: string }[] = [
    { key: "planta", value: current.plant ?? "" },
    { key: "direccion", value: current.direccion ?? "" },
    { key: "area", value: current.area ?? "" },
    { key: "ceco", value: current.costCenter ?? "" },
    { key: "jefe", value: current.manager ?? "" },
  ].filter((f) => f.value);

  const select = (
    label: string,
    key: string,
    value: string | undefined,
    opts: string[]
  ) => (
    <div>
      <label className="label-field" htmlFor={`filtro-${key}`}>
        {label}
      </label>
      <select
        id={`filtro-${key}`}
        value={value ?? ""}
        onChange={(e) => setParam(key, e.target.value)}
        disabled={isPending}
        className="field"
      >
        <option value="">Todas</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      className={clsx(
        "card transition-opacity print:hidden",
        isPending && "pointer-events-none opacity-60"
      )}
      aria-busy={isPending}
    >
      {activos.length > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span className="text-[13px] font-semibold text-brand-dark">
            Viendo solo:
          </span>
          {activos.map((f) => (
            <button
              key={f.key}
              onClick={() => clearOne(f.key)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-medium text-brand-dark transition hover:bg-brand/20"
              title={`Quitar el filtro de ${LABELS[f.key]}`}
            >
              <span className="text-slate-600">{LABELS[f.key]}:</span> {f.value}
              <span aria-hidden>×</span>
              <span className="sr-only">Quitar filtro</span>
            </button>
          ))}
          <button
            onClick={clearAll}
            className="min-h-9 text-xs font-semibold text-brand-dark underline underline-offset-2 hover:no-underline"
          >
            Quitar todos los filtros
          </button>
        </div>
      )}

      <p className="mb-3 text-[13px] text-slate-600">
        Al cambiar un filtro más amplio se limpian los de abajo, para que la
        selección sea coherente.
        {isPending && (
          <span className="ml-2 font-medium text-brand-dark">
            Actualizando el panel…
          </span>
        )}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {select("Planta / sede", "planta", current.plant, options.plants)}
        {select("Dirección", "direccion", current.direccion, options.directions)}
        {select("Área", "area", current.area, options.areas)}
        {select("Centro de costo", "ceco", current.costCenter, options.costCenters)}
        {select("Jefe / supervisor", "jefe", current.manager, options.managers)}
      </div>
    </div>
  );
}
