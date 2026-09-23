import { redirect } from "next/navigation";
import { getSessionProfile, getDashboardData, currentPeriod } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { decidirAutorizacion } from "./actions";
import { AuthRequestForm, type AuthEmployee } from "@/components/AuthRequestForm";
import type { WeekDayOpt } from "@/components/WeekDayPicker";
import { RULES } from "@/lib/overtime";

export const dynamic = "force-dynamic";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DOW = ["L", "M", "M", "J", "V", "S", "D"];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  solicitada: { label: "Solicitada", cls: "text-status-yellow" },
  aprobada: { label: "Aprobada", cls: "text-status-green" },
  rechazada: { label: "Rechazada", cls: "text-status-red" },
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function currentWeekDays(): WeekDayOpt[] {
  const now = new Date();
  const dow = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: iso(d),
      dow: DOW[i],
      day: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
    };
  });
}

function formatDay(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${DOW[(new Date(y, m - 1, d).getDay() || 7) - 1]} ${d}/${m}`;
}

export default async function AutorizacionesPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const period = currentPeriod();
  const supabase = createClient();

  const [{ statuses }, { data: authsRaw }] = await Promise.all([
    getDashboardData(period),
    supabase
      .from("overtime_authorizations")
      .select(
        "id, year, week, day_date, hours, reason, status, requested_at, decided_at, decision_note, employee_id, employees(code, name, area)"
      )
      .order("requested_at", { ascending: false }),
  ]);

  const monthlyByEmp = new Map(statuses.map((s) => [s.id, s.monthlyOvertime]));
  const employees: AuthEmployee[] = statuses
    .map((s) => ({
      id: s.id,
      name: s.name ?? s.code,
      area: s.area ?? "—",
      direccion: s.direccion,
      plant: s.plant,
      monthlyOvertime: s.monthlyOvertime,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const auths = (authsRaw ?? []) as any[];
  const canRequest = profile.role === "jefe" || profile.role === "rrhh";
  const canDecide = profile.role === "rrhh" || profile.role === "director";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">
          Autorización previa de horas extra
        </h1>
        <p className="text-sm text-slate-500">
          El jefe selecciona los días de la semana en curso (máximo{" "}
          {RULES.MAX_AUTHORIZATION_HOURS}h por día); el Director de planta o RRHH
          aprueban o rechazan.
        </p>
      </header>

      {canRequest && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-brand-dark">Nueva solicitud</h2>
          <AuthRequestForm
            employees={employees}
            days={currentWeekDays()}
            weekNumber={period.week}
            monthLabel={MONTHS[period.month - 1]}
            year={period.year}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">Solicitudes</h2>
        {auths.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">
            No hay solicitudes registradas.
          </div>
        ) : (
          <div className="space-y-3">
            {auths.map((r) => {
              const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.solicitada;
              const monthly = monthlyByEmp.get(r.employee_id) ?? 0;
              const projected = monthly + Number(r.hours);
              const flag =
                projected > RULES.MONTHLY_OVERTIME_LIMIT
                  ? { cls: "text-status-red", text: `⛔ superaría 48h (≈${projected.toFixed(0)}h)` }
                  : projected >= RULES.MONTHLY_OVERTIME_WARNING
                    ? { cls: "text-status-yellow", text: `⚠ cerca del límite (≈${projected.toFixed(0)}h)` }
                    : null;
              return (
                <div key={r.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {r.employees?.name ?? r.employees?.code} · {r.employees?.area ?? "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDay(r.day_date)
                          ? `${formatDay(r.day_date)} · `
                          : `Semana ${r.week} · `}
                        {r.year} · {Number(r.hours).toFixed(1)}h extra
                        {r.reason ? ` · ${r.reason}` : ""}
                      </div>
                      {flag && (
                        <div className={`mt-1 text-xs font-medium ${flag.cls}`}>{flag.text}</div>
                      )}
                      {r.decided_at && (
                        <div className="mt-1 text-xs text-slate-400">
                          Decisión registrada{r.decision_note ? `: ${r.decision_note}` : ""}
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${st.cls}`}>{st.label}</span>
                  </div>

                  {canDecide && r.status === "solicitada" && (
                    <div className="mt-3">
                      <form action={decidirAutorizacion} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          name="note"
                          placeholder="Nota de decisión"
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button name="decision" value="aprobada" className="btn-primary text-sm">
                          Aprobar
                        </button>
                        <button name="decision" value="rechazada" className="btn-secondary text-sm">
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
