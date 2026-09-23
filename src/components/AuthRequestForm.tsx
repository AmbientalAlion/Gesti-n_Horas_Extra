"use client";

import { useMemo, useState } from "react";
import { WeekDayPicker, type WeekDayOpt } from "./WeekDayPicker";
import { solicitarAutorizacion } from "@/app/(app)/autorizaciones/actions";

const MONTHLY_LIMIT = 48;
const MONTHLY_WARNING = 40;
const MAX_HOURS = 5;

export interface AuthEmployee {
  id: string;
  name: string;
  area: string;
  direccion?: string;
  plant?: string;
  monthlyOvertime: number;
}

export function AuthRequestForm({
  employees,
  days,
  weekNumber,
  monthLabel,
  year,
}: {
  employees: AuthEmployee[];
  days: WeekDayOpt[];
  weekNumber: number;
  monthLabel: string;
  year: number;
}) {
  const [empId, setEmpId] = useState("");
  const [empQuery, setEmpQuery] = useState("");
  const [hours, setHours] = useState(2);
  const [selected, setSelected] = useState<string[]>([]);

  const emp = employees.find((e) => e.id === empId);

  // Buscador incremental del empleado (nombre, ID, área, dirección, planta).
  const matches = useMemo(() => {
    const term = empQuery.trim().toLowerCase();
    if (!term) return [];
    return employees
      .filter((e) =>
        [e.name, e.area, e.direccion, e.plant]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [employees, empQuery]);

  const requested = hours * selected.length;
  const projected = emp ? emp.monthlyOvertime + requested : null;

  let warning: { tone: "red" | "yellow"; text: string } | null = null;
  if (emp && projected != null && selected.length > 0) {
    if (projected > MONTHLY_LIMIT) {
      warning = {
        tone: "red",
        text: `⛔ Superaría el límite mensual: ${emp.monthlyOvertime.toFixed(
          1
        )}h + ${requested.toFixed(1)}h = ${projected.toFixed(
          1
        )}h (máximo ${MONTHLY_LIMIT}h del mes).`,
      };
    } else if (projected >= MONTHLY_WARNING) {
      warning = {
        tone: "yellow",
        text: `⚠ Se acercaría al límite mensual: quedaría en ${projected.toFixed(
          1
        )}h de ${MONTHLY_LIMIT}h.`,
      };
    }
  }

  const toggle = (date: string) =>
    setSelected((s) =>
      s.includes(date) ? s.filter((d) => d !== date) : [...s, date].sort()
    );

  const canSubmit = !!empId && selected.length > 0 && hours > 0;

  return (
    <form action={solicitarAutorizacion} className="space-y-4">
      <input type="hidden" name="employeeId" value={empId} />
      {selected.map((d) => (
        <input key={d} type="hidden" name="days" value={d} />
      ))}

      <WeekDayPicker
        days={days}
        selected={selected}
        onToggle={toggle}
        onSelectAll={() => setSelected(days.map((d) => d.date))}
        onClear={() => setSelected([])}
        weekNumber={weekNumber}
        monthLabel={monthLabel}
        year={year}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="text-sm">
          <span className="mb-1 block text-slate-600">Empleado</span>
          {emp ? (
            <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand-tint px-3 py-2">
              <span className="font-medium text-brand-dark">
                {emp.name}
                <span className="ml-1 text-xs font-normal text-slate-500">
                  {emp.area} · {emp.monthlyOvertime.toFixed(0)}h/mes
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmpId("");
                  setEmpQuery("");
                }}
                className="text-xs text-brand hover:text-brand-dark"
              >
                cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="search"
                value={empQuery}
                onChange={(e) => setEmpQuery(e.target.value)}
                placeholder="Escriba nombre, área o dirección…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                autoComplete="off"
              />
              {matches.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setEmpId(m.id);
                          setEmpQuery("");
                        }}
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-tint"
                      >
                        <span className="font-medium text-slate-900">{m.name}</span>
                        <span className="text-xs text-slate-500">
                          {m.area}
                          {m.direccion ? ` · ${m.direccion}` : ""} ·{" "}
                          {m.monthlyOvertime.toFixed(0)}h/mes
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">
            Horas por día (máximo {MAX_HOURS})
          </span>
          <input
            name="hours"
            type="number"
            min={0.5}
            max={MAX_HOURS}
            step={0.5}
            value={hours}
            onChange={(e) =>
              setHours(Math.min(MAX_HOURS, Math.max(0, Number(e.target.value))))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
      </div>

      <input
        name="reason"
        placeholder="Motivo (opcional)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      {selected.length > 0 && emp && (
        <div className="rounded-lg border border-brand/30 bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          Total solicitado: <strong>{requested.toFixed(1)}h</strong> ({selected.length}{" "}
          día{selected.length > 1 ? "s" : ""} × {hours}h). Proyección del mes:{" "}
          <strong>≈ {projected?.toFixed(1)}h</strong> de {MONTHLY_LIMIT}h.
        </div>
      )}

      {warning && (
        <div
          className={
            warning.tone === "red"
              ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          }
        >
          {warning.text}
        </div>
      )}

      <button className="btn-primary text-sm disabled:opacity-50" type="submit" disabled={!canSubmit}>
        Solicitar autorización
      </button>
    </form>
  );
}
