import { FigureCluster } from "@/components/brand/Figures";

/**
 * Cabecera única de página: misma tarjeta blanca, mismo azul y misma medida de
 * lectura en todas las pantallas, para que ninguna parezca de otra aplicación.
 */
export function PageHeader({
  title,
  subtitle,
  toolbar,
}: {
  title: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
      <FigureCluster />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-[70ch] text-[15px] leading-relaxed text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>
    </header>
  );
}
