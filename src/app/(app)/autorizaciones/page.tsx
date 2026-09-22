import { redirect } from "next/navigation";
import { getSessionProfile, currentPeriod } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { solicitarAutorizacion, decidirAutorizacion } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  solicitada: { label: "Solicitada", cls: "text-status-yellow" },
  aprobada: { label: "Aprobada", cls: "text-status-green" },
  rechazada: { label: "Rechazada", cls: "text-status-red" },
};

export default async function AutorizacionesPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const cur = currentPeriod();

  const [{ data: auths }, { data: employees }] = await Promise.all([
    supabase
      .from("overtime_authorizations")
      .select(
        "id, year, week, hours, reason, status, requested_at, decided_at, decision_note, employees(code, name, area)"
      )
      .order("requested_at", { ascending: false }),
    supabase.from("employees").select("id, code, name, area").eq("active", true).order("code"),
  ]);

  const rows = (auths ?? []) as any[];
  const canRequest = profile.role === "jefe" || profile.role === "rrhh";
  const canDecide = profile.role === "rrhh";
  const emps = employees ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">
          Autorización previa de horas extra
        </h1>
        <p className="text-sm text-slate-500">
          El jefe solicita las horas extra; RRHH las aprueba o rechaza. Queda
          trazabilidad de quién solicitó y quién decidió.
        </p>
      </header>

      {canRequest && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-brand-dark">Nueva solicitud</h2>
          <form action={solicitarAutorizacion} className="grid gap-3 md:grid-cols-5">
            <select
              name="employeeId"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            >
              <option value="">Empleado…</option>
              {emps.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name ?? e.code} — {e.area ?? "—"}
                </option>
              ))}
            </select>
            <input
              name="week"
              type="number"
              min={1}
              max={53}
              defaultValue={cur.week}
              placeholder="Semana"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input type="hidden" name="year" value={cur.year} />
            <input
              name="hours"
              type="number"
              step="0.5"
              min="0.5"
              placeholder="Horas"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <button className="btn-primary text-sm">Solicitar</button>
            <input
              name="reason"
              placeholder="Motivo (opcional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-5"
            />
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Solicitudes</h2>
        {rows.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">
            No hay solicitudes registradas.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.solicitada;
              return (
                <div key={r.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {r.employees?.name ?? r.employees?.code} · {r.employees?.area ?? "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Semana {r.week} · {r.year} · {Number(r.hours).toFixed(1)}h extra
                        {r.reason ? ` · ${r.reason}` : ""}
                      </div>
                      {r.decided_at && (
                        <div className="mt-1 text-xs text-slate-400">
                          Decisión registrada{r.decision_note ? `: ${r.decision_note}` : ""}
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${st.cls}`}>{st.label}</span>
                  </div>

                  {canDecide && r.status === "solicitada" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <form action={decidirAutorizacion} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          name="note"
                          placeholder="Nota de decisión"
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button
                          name="decision"
                          value="aprobada"
                          className="btn-primary text-sm"
                        >
                          Aprobar
                        </button>
                        <button
                          name="decision"
                          value="rechazada"
                          className="btn-secondary text-sm"
                        >
                          Rechazar
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
