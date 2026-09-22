import clsx from "clsx";

export interface WeekDay {
  dow: string;
  day: number;
  isToday: boolean;
}

// Calendario de la semana actual (única habilitada). Los 7 días de la semana
// ISO en curso, resaltados; no hay navegación a otras semanas.
export function WeekCalendar({
  days,
  weekNumber,
  monthLabel,
  year,
}: {
  days: WeekDay[];
  weekNumber: number;
  monthLabel: string;
  year: number;
}) {
  return (
    <div className="rounded-lg border border-brand/30 bg-brand-tint p-3">
      <div className="mb-2 text-xs font-medium text-brand-dark">
        Semana {weekNumber} · {monthLabel} {year} (semana actual)
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            className={clsx(
              "flex flex-col items-center rounded-md py-2 text-xs",
              d.isToday
                ? "bg-brand font-semibold text-white"
                : "bg-white text-brand-dark"
            )}
          >
            <span className="opacity-70">{d.dow}</span>
            <span className="text-sm font-semibold">{d.day}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Solo se pueden registrar solicitudes para la semana en curso.
      </p>
    </div>
  );
}
