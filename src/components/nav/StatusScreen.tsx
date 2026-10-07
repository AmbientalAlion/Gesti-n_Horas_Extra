import clsx from "clsx";
import { BrandMark } from "@/components/brand/BrandMark";
import { Circulo, Triangulo } from "@/components/brand/Figures";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Pantalla de estado común (error, página inexistente, sin acceso): misma
 * tarjeta, mismo orden y una acción clara. Sirve en servidor y en cliente.
 *
 *   <StatusScreen tone="error" icon="alert" title="…" actions={…}>texto</StatusScreen>
 *
 * - `fullScreen`: ocupa la ventana (fuera del layout de la app) y muestra el logo.
 * - El icono entra con scale-in; la tarjeta con fade-up (.reveal). Con
 *   movimiento reducido solo se funden.
 * - Las figuras de marca van al 10% y nunca cruzan el texto.
 */
const TONES = {
  error: "bg-over-soft text-over ring-over-border",
  brand: "bg-primary-soft text-primary ring-brand-200/70",
  pending: "bg-pending-soft text-pending ring-pending-border",
} as const;

export function StatusScreen({
  tone = "brand",
  icon,
  title,
  children,
  actions,
  footer,
  fullScreen = false,
  role,
}: {
  tone?: keyof typeof TONES;
  icon: IconName;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** Línea pequeña bajo las acciones (código de soporte, cuenta…). */
  footer?: React.ReactNode;
  fullScreen?: boolean;
  role?: "alert" | "status";
}) {
  const card = (
    <section
      role={role}
      aria-labelledby="status-title"
      className="reveal relative w-full max-w-xl overflow-hidden rounded-hero border border-line bg-surface px-5 py-8 text-center shadow-2 sm:px-10 sm:py-10"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-10 print:hidden">
        <Circulo className="absolute -right-12 -top-12 h-40 w-40" />
        <Triangulo className="absolute -bottom-8 -left-6 h-24 w-24 -rotate-12" />
      </div>
      <div className="relative">
        {fullScreen && (
          <div className="mb-6 flex justify-center">
            <BrandMark size="md" />
          </div>
        )}
        <span
          className={clsx(
            "mx-auto flex h-14 w-14 animate-scale-in items-center justify-center rounded-full ring-1",
            TONES[tone]
          )}
          aria-hidden
        >
          <Icon name={icon} className="h-7 w-7" />
        </span>
        <h1 id="status-title" className="mt-5 text-h1 text-heading">
          {title}
        </h1>
        {children && (
          <div className="mx-auto mt-2 max-w-[52ch] space-y-2 text-body text-ink-2">{children}</div>
        )}
        {actions && (
          <div className="mt-6 flex flex-col-reverse items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            {actions}
          </div>
        )}
        {footer && <div className="mt-5 text-small text-muted">{footer}</div>}
      </div>
    </section>
  );

  if (!fullScreen) return <div className="flex justify-center py-6 sm:py-12">{card}</div>;
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 focus:outline-none"
    >
      {card}
    </main>
  );
}
