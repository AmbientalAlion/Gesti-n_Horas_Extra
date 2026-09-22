import { EmployeeTable } from "@/components/EmployeeTable";
import { StatCard } from "@/components/StatCard";
import { getDashboardData } from "@/lib/data";
import { RULES } from "@/lib/overtime";

export const dynamic = "force-dynamic";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default async function DashboardPage() {
  const { statuses, summary, period, demo, role } = await getDashboardData();

  const critical = statuses
    .filter((s) => s.level === "red")
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);

  const scopeLabel =
    role === "jefe" ? "Mi equipo" : "Planta completa";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard general</h1>
          <p className="text-sm text-slate-500">
            {scopeLabel} · Semana {period.week} · {MONTHS[period.month - 1]} {period.year}
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Base: {RULES.WEEKLY_BASE_HOURS}h/sem · Límite legal: {RULES.MONTHLY_OVERTIME_LIMIT}h/mes
        </div>
      </header>

      {demo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Modo demostración.</strong> Supabase no está configurado; se
          muestran datos de ejemplo. Define las variables de entorno para usar
          datos reales.
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Empleados" value={summary.totalEmployees} />
        <StatCard label="🟢 Normal" value={summary.green} tone="green" />
        <StatCard label="🟡 Preventivo" value={summary.yellow} tone="yellow" />
        <StatCard label="🔴 Crítico" value={summary.red} tone="red" />
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="Horas extra del mes"
          value={`${summary.totalMonthlyOvertime.toFixed(1)}h`}
          hint="Suma de toda la planta filtrada"
        />
        <StatCard
          label="Alertas semanales"
          value={summary.weeklyAlerts}
          hint={`> ${RULES.WEEKLY_OVERTIME_LIMIT}h extra en la semana`}
          tone={summary.weeklyAlerts > 0 ? "red" : "default"}
        />
        <StatCard
          label="Registros con error"
          value={summary.withErrors}
          hint="Horas huérfanas por revisar"
          tone={summary.withErrors > 0 ? "yellow" : "default"}
        />
      </section>

      {critical.length > 0 && (
        <section className="card border-red-200 bg-red-50">
          <h2 className="text-sm font-semibold text-red-800">
            Alertas críticas ({critical.length})
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {critical.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.name ?? s.code}</span>:{" "}
                {s.reasons.join(" ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Detalle por empleado
        </h2>
        <EmployeeTable rows={statuses} hrefBase="/empleado" />
      </section>
    </div>
  );
}
