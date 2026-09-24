"use client";

import { useMemo, useState } from "react";
import { EmployeeTable } from "./EmployeeTable";
import type { EmployeeStatus } from "@/lib/aggregate";
import type { SemaphoreLevel } from "@/lib/types";

const ESTADOS: { value: "" | SemaphoreLevel; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "red", label: "Crítico" },
  { value: "yellow", label: "Preventivo" },
  { value: "green", label: "Normal" },
];

export function FilterableEmployeeTable({
  rows,
  hrefBase,
  roleParam,
  query,
}: {
  rows: EmployeeStatus[];
  hrefBase?: string;
  roleParam?: string;
  /** Filtros vigentes, para volver al panel tal como estaba. */
  query?: string;
}) {
  // Los filtros de planta/área/jefe son globales (arriba del panel). Aquí solo
  // quedan la búsqueda por nombre/ID y el filtro por estado del semáforo.
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"" | SemaphoreLevel>("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (estado && r.level !== estado) return false;
      if (
        term &&
        !(r.name ?? "").toLowerCase().includes(term) &&
        !r.code.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [rows, q, estado]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="tabla-buscar">
          Buscar por nombre o identificación
        </label>
        <input
          id="tabla-buscar"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o identificación…"
          className="field sm:max-w-xs"
        />
        <label className="sr-only" htmlFor="tabla-estado">
          Filtrar por estado
        </label>
        <select
          id="tabla-estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as "" | SemaphoreLevel)}
          className="field sm:w-52"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <span className="text-[13px] text-slate-600 sm:ml-auto">
          Mostrando {filtered.length} de {rows.length}
        </span>
      </div>
      <EmployeeTable
        rows={filtered}
        hrefBase={hrefBase}
        roleParam={roleParam}
        query={query}
      />
    </div>
  );
}
