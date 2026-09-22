import { EmployeeTable } from "@/components/EmployeeTable";
import { StatCard } from "@/components/StatCard";
import { FigureCluster } from "@/components/brand/Figures";
import { demoDashboard } from "@/lib/demo";
import { RULES } from "@/lib/overtime";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const ROLE_LABEL: Record<Role, string> = {
  rrhh: "Recursos Humanos — planta completa",
  director: "Director General — planta completa",
  jefe: "Jefe Inmediato — solo su equipo",
};

export default function DemoDashboard({
  searchParams,
}: {
  searchParams: { rol?: string };
}) {
  const role = (["rrhh", "director", "jefe"].includes(searchParams.rol ?? "")
    ? searchParams.rol
    : "rrhh") as Role;

  const { statuses, summary, period } = demoDashboard(role);
  const critical = statuses
    .filter((s) => s.level === "red")
    .sort((a, b) => b.monthlyOvertime - a.monthlyOvertime);

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-6 py-5">
        <FigureCluster />
        <div className="relative">
          <h1 className="text-2xl font-bold text-brand-dark">Dashboard general</h1>
          <p className="text-sm text-slate-500">
            {ROLE_LABEL[role]} · Semana {period.week} · {MONTHS[period.month - 1]}{" "}
            {period.year}
          </p>
        </div>
      </header>

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
          hint="Suma del alcance visible"
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
        <h2 className="mb-3 text-lg font-semibold text-brand-dark">
          Detalle por empleado
        </h2>
        <EmployeeTable rows={statuses} hrefBase="/demo/empleado" roleParam={role} />
      </section>
    </div>
  );
}
