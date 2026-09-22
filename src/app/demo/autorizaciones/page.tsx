export const dynamic = "force-dynamic";

const DEMO_AUTHS = [
  {
    empleado: "Ana Restrepo",
    area: "Producción",
    week: 25,
    hours: 6,
    reason: "Pico de producción cierre de mes",
    status: "aprobada",
    nota: "Aprobado por RRHH · dentro del margen mensual",
  },
  {
    empleado: "Gustavo León",
    area: "Mantenimiento",
    week: 25,
    hours: 8,
    reason: "Parada de planta",
    status: "rechazada",
    nota: "Rechazado: ya superó el límite mensual",
  },
  {
    empleado: "Carlos Gómez",
    area: "Producción",
    week: 26,
    hours: 4,
    reason: "Reemplazo de turno",
    status: "solicitada",
    nota: "",
  },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  solicitada: { label: "Solicitada", cls: "text-status-yellow" },
  aprobada: { label: "Aprobada", cls: "text-status-green" },
  rechazada: { label: "Rechazada", cls: "text-status-red" },
};

export default function DemoAutorizaciones() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">
          Autorización previa de horas extra
        </h1>
        <p className="text-sm text-slate-500">
          El jefe solicita las horas extra; RRHH las aprueba o rechaza, con
          trazabilidad de quién solicitó y quién decidió.
        </p>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Vista de demostración (solo lectura).
      </div>

      <section className="space-y-3">
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
                    Semana {a.week} · {a.hours.toFixed(1)}h extra · {a.reason}
                  </div>
                  {a.nota && (
                    <div className="mt-1 text-xs text-slate-400">{a.nota}</div>
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
