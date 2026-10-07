import clsx from "clsx";
import type { SemaphoreLevel } from "@/lib/types";

/**
 * Gramática de estado (única en toda la app):
 *   Normal    → círculo, verde   (tokens ok)
 *   En riesgo → triángulo, naranja ALIÓN (tokens risk; el #FF8400 solo como
 *               relleno, el texto va en risk-fg)
 *   Excedido  → rombo, rojo      (tokens over)
 *   Por revisar → reloj, violeta (tokens pending)
 * El color nunca va solo: siempre forma + texto.
 *
 * Exporta:
 *   LEVEL_LABELS                     textos de cada nivel
 *   LEVEL_TEXT / LEVEL_SOLID / LEVEL_SOFT  clases de color por nivel
 *   <LevelIcon level className? />   forma del nivel (10px, currentColor)
 *   <PendingIcon className? />       reloj de «Por revisar»
 *   <StatusBadge level pending? size? />  píldora de estado (+ «Por revisar»)
 *   <PendingBadge count? size? />    solo la píldora «Por revisar»
 */
export const LEVEL_LABELS: Record<SemaphoreLevel, string> = {
  green: "Normal",
  yellow: "En riesgo",
  red: "Excedido",
};

/** Texto AA del estado (cifras, frases). */
export const LEVEL_TEXT: Record<SemaphoreLevel, string> = {
  green: "text-ok",
  yellow: "text-risk",
  red: "text-over",
};
/** Relleno del estado (barras, puntos, segmentos). */
export const LEVEL_SOLID: Record<SemaphoreLevel, string> = {
  green: "bg-ok-solid",
  yellow: "bg-risk-solid",
  red: "bg-over-solid",
};
/** Fondo suave + texto + borde (avisos, chips). */
export const LEVEL_SOFT: Record<SemaphoreLevel, string> = {
  green: "bg-ok-soft text-ok border-ok-border",
  yellow: "bg-risk-soft text-risk border-risk-border",
  red: "bg-over-soft text-over border-over-border",
};

/**
 * Cada estado tiene su propia forma además del color (círculo, triángulo,
 * rombo), para que no dependa solo del color.
 */
export function LevelIcon({
  level,
  className,
}: {
  level: SemaphoreLevel;
  className?: string;
}) {
  const cls = clsx("h-2.5 w-2.5 shrink-0 print-exact", className);
  if (level === "red") {
    return (
      <svg viewBox="0 0 10 10" className={cls} aria-hidden focusable="false">
        <path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="currentColor" />
      </svg>
    );
  }
  if (level === "yellow") {
    return (
      <svg viewBox="0 0 10 10" className={cls} aria-hidden focusable="false">
        <path d="M5 0.8 9.6 9.2H0.4Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 10 10" className={cls} aria-hidden focusable="false">
      <circle cx="5" cy="5" r="4.2" fill="currentColor" />
    </svg>
  );
}

/** Icono de «por revisar» (reloj): registros congelados sin resolver. */
export function PendingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={clsx("h-3 w-3 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.6V8l2.3 1.6" />
    </svg>
  );
}

const PILL =
  "print-exact inline-flex items-center whitespace-nowrap rounded-full border font-semibold leading-none";
const SIZE = {
  sm: "gap-1 px-2 py-[3px] text-[11px]",
  md: "gap-1.5 px-2.5 py-1 text-caption",
} as const;

export function PendingBadge({
  count = 1,
  size = "md",
}: {
  count?: number;
  size?: keyof typeof SIZE;
}) {
  const many = count > 1;
  return (
    <span
      className={clsx(PILL, SIZE[size], "border-pending-border bg-pending-soft text-pending")}
      title={`${count} registro${many ? "s" : ""} congelado${many ? "s" : ""} por revisar: el estado puede cambiar al resolverlo${many ? "s" : ""}.`}
    >
      <PendingIcon />
      Por revisar
    </span>
  );
}

/**
 * Estado del semáforo. Con `pending`, añade el aviso «Por revisar»: la
 * persona tiene registros congelados y su estado puede cambiar al resolverlos.
 */
export function StatusBadge({
  level,
  pending = 0,
  size = "md",
  className,
}: {
  level: SemaphoreLevel;
  pending?: number;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex flex-wrap items-center gap-1", className)}>
      <span className={clsx(PILL, SIZE[size], LEVEL_SOFT[level])}>
        <LevelIcon level={level} className={size === "sm" ? "h-2 w-2" : undefined} />
        {LEVEL_LABELS[level]}
      </span>
      {pending > 0 && <PendingBadge count={pending} size={size} />}
    </span>
  );
}
