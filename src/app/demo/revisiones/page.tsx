import { segmentOfWeek } from "@/lib/dates";
import { demoEmployees, demoRecords } from "@/lib/demo";

export const dynamic = "force-dynamic";


export default function DemoRevisiones() {
  const nameOf = new Map(demoEmployees.map((e) => [e.id, e]));
  const pendientes = demoRecords.filter((r) => r.hasError);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-heading">Bandeja de horas huérfanas</h1>
        <p className="text-sm text-muted">
          Registros congelados por turnos anómalos (&gt;16h sin marcación). En la app
          real, RRHH corrige las horas o descarta el registro con trazabilidad.
        </p>
      </header>

      <div className="rounded-lg border border-risk-border bg-risk-soft px-4 py-2 text-xs text-risk">
        Vista de demostración (solo lectura): las acciones no persisten.
      </div>

      <section className="space-y-4">
        {pendientes.length === 0 ? (
          <div className="card text-center text-sm text-muted">
            No hay registros pendientes.
          </div>
        ) : (
          pendientes.map((r, i) => {
            const emp = nameOf.get(r.employeeId);
            return (
              <div key={i} className="card border-risk-border bg-risk-soft">
                <div className="font-medium text-ink">
                  {emp?.name ?? r.employeeId} · {emp?.area ?? "—"}
                </div>
                <div className="text-xs text-muted">
                  {segmentOfWeek(r.year, r.month, r.week)?.label ?? `Semana ${r.week}`} {r.year} · Total{" "}
                  {r.totalHours.toFixed(1)}h · Turno máx{" "}
                  {r.maxShiftHours != null ? `${r.maxShiftHours.toFixed(1)}h` : "—"}
                </div>
                <div className="mt-1 text-xs font-medium text-risk">{r.errorReason}</div>
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
