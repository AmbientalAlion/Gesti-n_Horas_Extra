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
  // Los filtros de planta/área/jefe son globales (arriba del dashboard). Aquí
  // solo quedan la búsqueda por nombre/ID y el filtro por estado del semáforo.
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
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empleado por nombre o ID…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
        />
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
