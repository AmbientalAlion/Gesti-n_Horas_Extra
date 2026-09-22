"use client";

import { useMemo, useState } from "react";
import { EmployeeTable } from "./EmployeeTable";
import type { EmployeeStatus } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";

const ESTADOS: { value: "" | SemaphoreLevel; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "red", label: "🔴 Crítico" },
  { value: "yellow", label: "🟡 Preventivo" },
  { value: "green", label: "🟢 Normal" },
];

export function FilterableEmployeeTable({
  rows,
  hrefBase,
  roleParam,
}: {
  rows: EmployeeStatus[];
  hrefBase?: string;
  roleParam?: string;
}) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [plant, setPlant] = useState("");
  const [estado, setEstado] = useState<"" | SemaphoreLevel>("");

  const areas = useMemo(
    () => [...new Set(rows.map((r) => r.area ?? "Sin área"))].sort(),
    [rows]
  );
  const plants = useMemo(
    () => [...new Set(rows.map((r) => r.plant ?? "Sin planta"))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (area && (r.area ?? "Sin área") !== area) return false;
      if (plant && (r.plant ?? "Sin planta") !== plant) return false;
      if (estado && r.level !== estado) return false;
      if (
        term &&
        !(r.name ?? "").toLowerCase().includes(term) &&
        !r.code.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [rows, q, area, plant, estado]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empleado por nombre o ID…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={plant}
          onChange={(e) => setPlant(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las plantas</option>
          {plants.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as "" | SemaphoreLevel)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400 sm:ml-auto">
          {filtered.length} de {rows.length}
        </span>
      </div>
      <EmployeeTable rows={filtered} hrefBase={hrefBase} roleParam={roleParam} />
    </div>
  );
}
