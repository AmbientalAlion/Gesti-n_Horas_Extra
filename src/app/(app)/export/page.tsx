import { getDashboardData } from "@/lib/data";
import { ExportPanel } from "@/components/ExportPanel";

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
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Módulo de exportación</h1>
        <p className="text-sm text-slate-500">
          Descarga un CSV limpio con las novedades de horas extras depuradas,
          listo para el software de nómina.
        </p>
      </header>

      <div className="card">
        <p className="text-sm text-slate-600">
          Periodo: <strong>{MONTHS[period.month - 1]} {period.year}</strong>
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          <li>✅ {exportable.length} empleados con novedades de horas extra</li>
          <li>⚠ {excluded.length} registros excluidos por error (revisión manual)</li>
        </ul>
        <div className="mt-4">
          <ExportPanel period={period} />
        </div>
      </div>
    </div>
  );
}
