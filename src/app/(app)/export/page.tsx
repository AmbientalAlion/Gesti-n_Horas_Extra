import Link from "next/link";
import { getDashboardData } from "@/lib/data";
import { ExportPanel } from "@/components/ExportPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default async function ExportPage() {
  const { statuses, period } = await getDashboardData();

  const exportable = statuses.filter((s) => !s.hasError && s.monthlyOvertime > 0);
  const excluded = statuses.filter((s) => s.hasError);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exportar novedades para nómina"
        subtitle="Descargue el archivo depurado de horas extra, listo para el software de nómina. Los registros congelados por horas huérfanas no se incluyen."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Listos para nómina"
          value={exportable.length}
          hint="Se incluyen en el archivo"
        />
        <StatCard
          label="Excluidos por revisar"
          value={excluded.length}
          tone={excluded.length > 0 ? "yellow" : "default"}
          hint="Horas huérfanas: no se exportan"
        />
      </section>

      <div className="card">
        <p className="text-sm text-slate-600">
          Periodo: <strong>{MONTHS[period.month - 1]} {period.year}</strong>
        </p>
        {exportable.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No hay novedades de horas extra en este periodo. Cargue el archivo del
            biométrico en «Cargar horas del biométrico» y vuelva a intentarlo.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ExportPanel period={period} />
            {excluded.length > 0 && (
              <Link href="/revisiones" className="btn-secondary text-sm">
                Revisar {excluded.length} registro{excluded.length > 1 ? "s" : ""} congelado
                {excluded.length > 1 ? "s" : ""} antes de exportar
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
