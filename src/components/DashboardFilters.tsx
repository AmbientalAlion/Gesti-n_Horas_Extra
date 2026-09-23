"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FilterOptions, Filters } from "@/lib/aggregate";

const KEYS = ["planta", "direccion", "area", "ceco", "jefe"];

export function DashboardFilters({
  options,
  current,
}: {
  options: FilterOptions;
  current: Filters;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`?${next.toString()}`);
  };

  const clearAll = () => {
    const next = new URLSearchParams(params.toString());
    KEYS.forEach((k) => next.delete(k));
    router.push(`?${next.toString()}`);
  };

  const active = !!(
    current.plant ||
    current.direccion ||
    current.area ||
    current.costCenter ||
    current.manager
  );

  const select = (
    label: string,
    key: string,
    value: string | undefined,
    opts: string[]
  ) => (
    <label className="text-xs">
      <span className="mb-1 block text-slate-500">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => setParam(key, e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Todas</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="card print:hidden">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {select("Planta / sede", "planta", current.plant, options.plants)}
        {select("Dirección", "direccion", current.direccion, options.directions)}
        {select("Área", "area", current.area, options.areas)}
        {select("Centro de costo", "ceco", current.costCenter, options.costCenters)}
        {select("Jefe / supervisor", "jefe", current.manager, options.managers)}
      </div>
      {active && (
        <button
          onClick={clearAll}
          className="mt-3 text-xs font-medium text-brand hover:text-brand-dark"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
