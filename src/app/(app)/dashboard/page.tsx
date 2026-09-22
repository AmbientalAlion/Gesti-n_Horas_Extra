import { DashboardView } from "@/components/DashboardView";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { statuses, summary, charts, period, demo, role } =
    await getDashboardData();

  const scopeLabel = role === "jefe" ? "Mi equipo" : "Planta completa";

  return (
    <div className="space-y-6">
      {demo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Modo demostración.</strong> Supabase no está configurado; se
          muestran datos de ejemplo.
        </div>
      )}
      <DashboardView
        statuses={statuses}
        summary={summary}
        charts={charts}
        period={period}
        scopeLabel={scopeLabel}
        hrefBase="/empleado"
      />
    </div>
  );
}
