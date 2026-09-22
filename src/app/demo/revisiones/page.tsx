import { demoEmployees, demoRecords } from "@/lib/demo";

export const dynamic = "force-dynamic";

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export default function DemoRevisiones() {
  const nameOf = new Map(demoEmployees.map((e) => [e.id, e]));
  const pendientes = demoRecords.filter((r) => r.hasError);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">Bandeja de horas huérfanas</h1>
        <p className="text-sm text-slate-500">
          Registros congelados por turnos anómalos (&gt;16h sin marcación). En la app
          real, RRHH corrige las horas o descarta el registro con trazabilidad.
        </p>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Vista de demostración (solo lectura): las acciones no persisten.
      </div>

      <section className="space-y-4">
        {pendientes.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">
            No hay registros pendientes.
          </div>
        ) : (
          pendientes.map((r, i) => {
            const emp = nameOf.get(r.employeeId);
            return (
              <div key={i} className="card border-amber-200 bg-amber-50">
                <div className="font-medium text-slate-900">
                  {emp?.name ?? r.employeeId} · {emp?.area ?? "—"}
                </div>
                <div className="text-xs text-slate-500">
                  Semana {r.week} · {MONTHS[r.month - 1]} {r.year} · Total{" "}
                  {r.totalHours.toFixed(1)}h · Turno máx{" "}
                  {r.maxShiftHours != null ? `${r.maxShiftHours.toFixed(1)}h` : "—"}
                </div>
                <div className="mt-1 text-xs font-medium text-amber-700">{r.errorReason}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary text-sm" disabled>
                    Corregir y reincorporar
                  </button>
                  <button className="btn-secondary text-sm" disabled>
                    Descartar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
