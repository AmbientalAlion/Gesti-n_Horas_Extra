"use client";

import { useState } from "react";
import { WeekCalendar, type WeekDay } from "./WeekCalendar";
import { solicitarAutorizacion } from "@/app/(app)/autorizaciones/actions";

const MONTHLY_LIMIT = 48;
const MONTHLY_WARNING = 40;
const MAX_HOURS = 5;

export interface AuthEmployee {
  id: string;
  name: string;
  area: string;
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
  days: WeekDay[];
  weekNumber: number;
  monthLabel: string;
  year: number;
}) {
  const [empId, setEmpId] = useState("");
  const [hours, setHours] = useState(1);

  const emp = employees.find((e) => e.id === empId);
  const projected = emp ? emp.monthlyOvertime + (hours || 0) : null;

  let warning: { tone: "red" | "yellow"; text: string } | null = null;
  if (emp && projected != null) {
    if (projected > MONTHLY_LIMIT) {
      warning = {
        tone: "red",
        text: `⛔ Superaría el límite mensual: ${emp.monthlyOvertime.toFixed(
          1
        )}h + ${hours}h = ${projected.toFixed(1)}h (máximo ${MONTHLY_LIMIT}h).`,
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

  return (
    <form action={solicitarAutorizacion} className="space-y-4">
      <WeekCalendar days={days} weekNumber={weekNumber} monthLabel={monthLabel} year={year} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Empleado</span>
          <select
            name="employeeId"
            required
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccione…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.area} ({e.monthlyOvertime.toFixed(0)}h/mes)
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">
            Horas extra (máximo {MAX_HOURS})
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

      <button className="btn-primary text-sm" type="submit">
        Solicitar autorización
      </button>
    </form>
  );
}
