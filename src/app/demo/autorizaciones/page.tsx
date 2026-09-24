import { WeekDayPicker, type WeekDayOpt } from "@/components/WeekDayPicker";

export const dynamic = "force-dynamic";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DOW = ["L", "M", "M", "J", "V", "S", "D"];

const STATUS: Record<string, { label: string; cls: string }> = {
  solicitada: { label: "Solicitada", cls: "text-status-yellow" },
  aprobada: { label: "Aprobada", cls: "text-status-green" },
  rechazada: { label: "Rechazada", cls: "text-status-red" },
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function weekDays(): { days: WeekDayOpt[]; selected: string[] } {
  const now = new Date();
  const dow = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow - 1));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: iso(d),
      dow: DOW[i],
      day: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
    };
  });
  // Selección de ejemplo: L–V (semana laboral).
  return { days, selected: days.slice(0, 5).map((d) => d.date) };
}

const DEMO_AUTHS = [
  { empleado: "Ana Restrepo", area: "Producción Rionegro", dia: "Mié 3/9", hours: 4, reason: "Pico de cierre", status: "aprobada", flag: "" },
  { empleado: "Gustavo León", area: "Producción", dia: "Jue 4/9", hours: 5, reason: "Parada de planta", status: "rechazada", flag: "⛔ superaría 48h" },
  { empleado: "Carlos Gómez", area: "Producción Rionegro", dia: "Vie 5/9", hours: 3, reason: "Reemplazo de turno", status: "solicitada", flag: "⚠ cerca del límite" },
];

export default function DemoAutorizaciones() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const { days, selected } = weekDays();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">
          Autorización previa de horas extra
        </h1>
        <p className="text-sm text-slate-500">
          El jefe selecciona los días de la semana en curso (máximo 5h por día); el
          Director de planta o RRHH aprueban o rechazan. Advertencia si se acerca o
          pasa el límite mensual.
        </p>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Vista de demostración (solo lectura).
      </div>

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-brand-dark">Nueva solicitud</h2>
        <WeekDayPicker
          days={days}
          selected={selected}
          readOnly
          weekNumber={25}
          monthLabel={MONTHS[month - 1]}
          year={now.getFullYear()}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-sm">
            <span className="mb-1 block text-slate-600">Empleado</span>
            <div className="rounded-lg border border-slate-300 px-3 py-2 text-slate-500">
              Ana Restrepo — Producción Rionegro
            </div>
          </div>
          <div className="text-sm">
            <span className="mb-1 block text-slate-600">Horas por día (máximo 5)</span>
            <div className="rounded-lg border border-slate-300 px-3 py-2 text-slate-500">3</div>
          </div>
        </div>
        <div className="rounded-lg border border-brand/30 bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          Total solicitado: <strong>15.0h</strong> (5 días × 3h).
        </div>
        <button className="btn-primary text-sm" disabled>
          Solicitar autorización
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-dark">Solicitudes</h2>
        {DEMO_AUTHS.map((a, i) => {
          const st = STATUS[a.status];
          return (
            <div key={i} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">
                    {a.empleado} · {a.area}
                  </div>
                  <div className="text-xs text-slate-500">
                    {a.dia} · {a.hours.toFixed(1)}h extra · {a.reason}
                  </div>
                  {a.flag && (
                    <div className="mt-1 text-xs font-medium text-status-red">{a.flag}</div>
                  )}
                </div>
                <span className={`text-sm font-semibold ${st.cls}`}>{st.label}</span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
