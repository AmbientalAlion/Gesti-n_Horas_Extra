"use client";

import clsx from "clsx";

export interface WeekDayOpt {
  /** Fecha ISO (yyyy-mm-dd) del día. */
  date: string;
  /** Etiqueta corta del día de la semana (L, M, M, J, V, S, D). */
  dow: string;
  /** Día del mes. */
  day: number;
  isToday: boolean;
}

/**
 * Calendario interactivo de la semana en curso. Permite seleccionar uno o
 * varios días (o "toda la semana"). Es la única semana habilitada — no hay
 * navegación a otras semanas (regla de autorización previa de ALIÓN).
 */
export function WeekDayPicker({
  days,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  weekNumber,
  monthLabel,
  year,
  readOnly = false,
}: {
  days: WeekDayOpt[];
  selected: string[];
  onToggle?: (date: string) => void;
  onSelectAll?: () => void;
  onClear?: () => void;
  weekNumber: number;
  monthLabel: string;
  year: number;
  readOnly?: boolean;
}) {
  const isSel = (d: string) => selected.includes(d);
  const allSelected = selected.length === days.length && days.length > 0;

  return (
    <div className="rounded-xl border border-brand/30 bg-brand-tint p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-brand-dark">
          Semana {weekNumber} · {monthLabel} {year}{" "}
          <span className="font-normal text-slate-500">(semana en curso)</span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? onClear : onSelectAll}
              className="inline-flex min-h-11 items-center rounded-md border border-brand/40 bg-white px-3 py-1 text-xs font-medium text-brand-dark transition hover:bg-brand hover:text-white"
            >
              {allSelected ? "Limpiar" : "Toda la semana"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((d) => {
          const sel = isSel(d.date);
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={sel}
              disabled={readOnly}
              onClick={() => onToggle?.(d.date)}
              className={clsx(
                "flex min-h-[52px] flex-col items-center justify-center rounded-lg px-0 py-2 transition",
                readOnly && "cursor-default",
                sel
                  ? "bg-brand font-semibold text-white shadow-sm"
                  : "bg-white text-brand-dark hover:bg-brand/10",
                d.isToday && !sel && "ring-2 ring-brand/50"
              )}
              title={d.isToday ? "Hoy" : undefined}
            >
              <span className="text-xs opacity-70">{d.dow}</span>
              <span className="mt-0.5 text-[15px] font-bold">{d.day}</span>
              {sel && <span className="mt-0.5 text-[9px] leading-none">✓</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[11px] text-slate-500">
        {readOnly
          ? "Solo se autorizan horas de la semana en curso."
          : selected.length === 0
            ? "Seleccione uno o varios días de la semana en curso."
            : `${selected.length} día${selected.length > 1 ? "s" : ""} seleccionado${
                selected.length > 1 ? "s" : ""
              }.`}
      </p>
    </div>
  );
}
