import { DashboardView } from "@/components/DashboardView";
import { MonthSelector } from "@/components/MonthSelector";
import { PrintButton } from "@/components/PrintButton";
import { getDashboardData } from "@/lib/data";
import { currentPeriodInfo, periodForMonth } from "@/lib/dates";
import type { Filters } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    mes?: string;
    anio?: string;
    planta?: string;
    direccion?: string;
    area?: string;
    ceco?: string;
    jefe?: string;
  };
}) {
  // Mes calendario elegido (o el actual). La fecha de corte sale de los datos.
  const cur = currentPeriodInfo();
  const mesSel = Number(searchParams.mes);
  const anioSel = Number(searchParams.anio);
  const month = mesSel >= 1 && mesSel <= 12 ? mesSel : cur.month;
  const year = anioSel >= 2000 && anioSel <= 2100 ? anioSel : cur.year;
  const info = periodForMonth(year, month);
  const period = {
    year: info.year,
    month: info.month,
    week: info.week,
    status: info.status,
    daysInMonth: info.daysInMonth,
  };

  const filters: Filters = {
    plant: searchParams.planta || undefined,
    direccion: searchParams.direccion || undefined,
    area: searchParams.area || undefined,
    costCenter: searchParams.ceco || undefined,
    manager: searchParams.jefe || undefined,
  };

  // Query vigente (filtros + mes) para que los enlaces a la ficha vuelvan aquí
  // con el panel tal como el usuario lo dejó.
  const query = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v) as [string, string][]
  ).toString();

  const { statuses, summary, charts, demo, role, filterOptions, period: dataPeriod } =
    await getDashboardData(period, filters);

  const scopeLabel =
    role === "jefe" ? "Mi equipo" : role === "director" ? "Mi dirección" : "Toda la organización";

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
        period={dataPeriod}
        scopeLabel={scopeLabel}
        hrefBase="/empleado"
        role={role === "demo" ? "demo" : role}
        filterOptions={filterOptions}
        filters={filters}
        query={query}
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
