import { DashboardView } from "@/components/DashboardView";
import { MonthSelector } from "@/components/MonthSelector";
import { PrintButton } from "@/components/PrintButton";
import { currentPeriod, getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { mes?: string; anio?: string };
}) {
  const cur = currentPeriod();
  const month = Number(searchParams.mes) || cur.month;
  const year = Number(searchParams.anio) || cur.year;
  const period = { year, month, week: cur.week };

  const { statuses, summary, charts, demo, role } =
    await getDashboardData(period);

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
        toolbar={
          <>
            <MonthSelector year={year} month={month} />
            <PrintButton />
          </>
        }
      />
    </div>
  );
}
