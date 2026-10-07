import clsx from "clsx";
import { FigureCluster } from "@/components/brand/Figures";

/**
 * Cabecera única de página: misma tarjeta, mismo azul y misma medida de
 * lectura en todas las pantallas, para que ninguna parezca de otra aplicación.
 *
 *   <PageHeader
 *     eyebrow="Recursos Humanos"            // antetítulo opcional (12px)
 *     title="Exportar a nómina"
 *     subtitle="Archivo CSV con las horas válidas del mes."
 *     actions={<PrintButton />}             // botones a la derecha (en móvil, debajo)
 *   >
 *     <span className="chip">Junio 2026</span>   // fila opcional de chips/metadatos
 *   </PageHeader>
 *
 * `toolbar` se mantiene como alias de `actions`. `figures={false}` quita las
 * figuras de marca; `figures="dashboard" | "ficha"` cambia la composición.
 * Entra con .reveal (fade-up 220ms, sin retraso).
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  toolbar,
  figures = "page",
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** @deprecated use `actions`. */
  toolbar?: React.ReactNode;
  figures?: false | "page" | "dashboard" | "ficha";
  className?: string;
  children?: React.ReactNode;
}) {
  const right = actions ?? toolbar;
  return (
    <header
      className={clsx(
        "reveal relative overflow-hidden rounded-hero border border-line bg-surface px-4 py-5 shadow-1 sm:px-6 sm:py-6",
        className
      )}
    >
      {figures && <FigureCluster variant={figures} />}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-[68ch] pr-10 sm:pr-0">
          {eyebrow && (
            <p className="mb-1 text-caption font-semibold uppercase tracking-[0.02em] text-link">
              {eyebrow}
            </p>
          )}
          <h1 className="text-h1 text-heading">{title}</h1>
          {subtitle && <p className="mt-1.5 text-body text-ink-2">{subtitle}</p>}
          {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
        </div>
        {right && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end print:hidden">
            {right}
          </div>
        )}
      </div>
    </header>
  );
}
