import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { corregirRegistro, descartarRegistro } from "./actions";

export const dynamic = "force-dynamic";

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export default async function RevisionesPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "rrhh") redirect("/dashboard");

  const supabase = createClient();
  const { data } = await supabase
    .from("weekly_records")
    .select(
      "id, year, week, month, total_hours, max_shift_hours, error_reason, review_status, review_note, reviewed_at, has_error, employees(code, name, area)"
    )
    .or("has_error.eq.true,review_status.not.is.null")
    .order("year", { ascending: false })
    .order("week", { ascending: false });

  const rows = (data ?? []) as any[];
  const pendientes = rows.filter((r) => r.has_error && !r.review_status);
  const revisados = rows.filter((r) => r.review_status);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">Bandeja de horas huérfanas</h1>
        <p className="text-sm text-slate-500">
          Registros congelados por turnos anómalos (&gt;16h sin marcación). Corrija
          las horas o descarte el registro; queda trazabilidad del responsable.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          Pendientes ({pendientes.length})
        </h2>
        {pendientes.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">
            No hay registros pendientes de revisión. 👍
          </div>
        ) : (
          <div className="space-y-4">
            {pendientes.map((r) => (
              <div key={r.id} className="card border-amber-200 bg-amber-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {r.employees?.name ?? r.employees?.code} · {r.employees?.area ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Semana {r.week} · {MONTHS[r.month - 1]} {r.year} · Total cargado{" "}
                      {Number(r.total_hours).toFixed(1)}h · Turno máx{" "}
                      {r.max_shift_hours != null ? `${Number(r.max_shift_hours).toFixed(1)}h` : "—"}
                    </div>
                    <div className="mt-1 text-xs font-medium text-amber-700">
                      {r.error_reason}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={corregirRegistro} className="rounded-lg border border-slate-200 bg-white p-3">
                    <input type="hidden" name="id" value={r.id} />
                    <p className="mb-2 text-xs font-semibold text-slate-600">Corregir horas</p>
                    <div className="flex items-center gap-2">
                      <input
                        name="horas"
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={Number(r.total_hours)}
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                        required
                      />
                      <span className="text-xs text-slate-400">horas reales</span>
                    </div>
                    <input
                      name="nota"
                      placeholder="Motivo / observación"
                      className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button className="btn-primary mt-2 w-full text-sm">Corregir y reincorporar</button>
                  </form>

                  <form action={descartarRegistro} className="rounded-lg border border-slate-200 bg-white p-3">
                    <input type="hidden" name="id" value={r.id} />
                    <p className="mb-2 text-xs font-semibold text-slate-600">Descartar</p>
                    <input
                      name="nota"
                      placeholder="Motivo del descarte"
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button className="btn-secondary mt-2 w-full text-sm">
                      Descartar (no se contabiliza)
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {revisados.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-dark">
            Historial de revisiones ({revisados.length})
          </h2>
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Empleado</th>
                  <th className="px-4 py-2 font-medium">Periodo</th>
                  <th className="px-4 py-2 font-medium">Resultado</th>
                  <th className="px-4 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revisados.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      {r.employees?.name ?? r.employees?.code}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      Sem {r.week} · {MONTHS[r.month - 1]} {r.year}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          r.review_status === "corregido"
                            ? "text-status-green"
                            : "text-slate-500"
                        }
                      >
                        {r.review_status === "corregido" ? "Corregido" : "Descartado"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{r.review_note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
