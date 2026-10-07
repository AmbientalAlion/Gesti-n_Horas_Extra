import Link from "next/link";
import { getPayrollData, requireRrhh } from "@/lib/data";
import { ExportPanel } from "@/components/ExportPanel";
import { MonthSelector } from "@/components/MonthSelector";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { currentPeriodInfo, monthLabel, todayInPlant } from "@/lib/dates";
import { fmtH } from "@/lib/overtime";
import { LEVEL_LABEL, payrollTotals } from "@/lib/payroll";

export const dynamic = "force-dynamic";

/** Mes por defecto: el anterior durante los primeros 5 días (cierre de nómina). */
function defaultMonth(): { year: number; month: number } {
  const today = todayInPlant();
  const cur = currentPeriodInfo();
  if (today.d <= 5) {
    return cur.month === 1 ? { year: cur.year - 1, month: 12 } : { year: cur.year, month: cur.month - 1 };
  }
  return { year: cur.year, month: cur.month };
}

export default async function ExportPage({
  searchParams,
}: {
  searchParams: { mes?: string; anio?: string };
}) {
  await requireRrhh();
  const def = defaultMonth();
  const m = Number(searchParams.mes);
  const y = Number(searchParams.anio);
  const month = m >= 1 && m <= 12 ? m : def.month;
  const year = y >= 2000 && y <= 2100 ? y : def.year;

  const { rows, period } = await getPayrollData(year, month);
  const t = payrollTotals(rows);
  const closed = period.status === "cerrado";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exportar a nómina"
        subtitle="Archivo con las horas extra válidas de cada persona en el mes, con el desglose de recargos. Las semanas congeladas se excluyen; la persona sale con el resto de sus horas."
        toolbar={<MonthSelector year={year} month={month} />}
      />

      {!closed && (
        <div className="rounded-lg border border-risk-border bg-risk-soft px-4 py-3 text-sm text-risk">
          {monthLabel(year, month)} todavía no ha cerrado: el archivo puede cambiar con las
          próximas cargas.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Personas con horas" value={t.people} hint="Filas del archivo" />
        <StatCard label="Horas extra válidas" value={fmtH(t.hours)} hint={monthLabel(year, month)} />
        <StatCard
          label="Semanas por revisar"
          value={t.pendingWeeks}
          tone={t.pendingWeeks > 0 ? "yellow" : "default"}
          hint={
            t.pendingWeeks > 0
              ? `De ${t.pendingPeople} persona${t.pendingPeople === 1 ? "" : "s"}: no se exportan`
              : "Nada congelado"
          }
        />
      </section>

      <div className="card space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-ink-2">
            No hay horas extra en {monthLabel(year, month)}. Cargue el archivo del biométrico y
            vuelva a intentarlo.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <ExportPanel period={period} />
            {t.pendingWeeks > 0 && (
              <Link href="/revisiones" className="btn-secondary text-sm">
                Revisar {t.pendingWeeks} semana{t.pendingWeeks > 1 ? "s" : ""} congelada
                {t.pendingWeeks > 1 ? "s" : ""} antes de exportar
              </Link>
            )}
          </div>
        )}
        <p className="text-xs text-muted">
          CSV para Excel en español: separador «;», coma decimal y tildes. Cada descarga queda
          registrada con su huella.
        </p>
      </div>

      {rows.length > 0 && (
        <section className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-line text-sm">
            <caption className="px-4 py-3 text-left text-sm font-semibold text-heading">
              Vista previa ({rows.length} filas)
            </caption>
            <thead className="bg-surface-2 text-left text-xs uppercase text-ink-2">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">ID</th>
                <th scope="col" className="px-4 py-2 font-medium">Nombre</th>
                <th scope="col" className="px-4 py-2 font-medium">Área</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Horas válidas</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Semanas por revisar</th>
                <th scope="col" className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.slice(0, 200).map((r) => (
                <tr key={r.code}>
                  <td className="px-4 py-2">{r.code}</td>
                  <td className="px-4 py-2">{r.name || "—"}</td>
                  <td className="px-4 py-2">{r.area || "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtH(r.overtimeHours)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.pendingWeeks || "—"}</td>
                  <td className="px-4 py-2">{LEVEL_LABEL[r.level]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 200 && (
            <p className="px-4 py-2 text-xs text-muted">
              Se muestran 200 de {rows.length}; el archivo trae todas.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
