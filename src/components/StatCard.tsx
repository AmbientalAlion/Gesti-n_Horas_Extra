import clsx from "clsx";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { LevelIcon, PendingIcon } from "@/components/StatusBadge";

type Tone = "default" | "green" | "yellow" | "red" | "violet" | "ok" | "risk" | "over" | "pending";

interface StatCardProps {
  label: string;
  /** Texto ya formateado, o número (se anima si `animate` no es false). */
  value: string | number;
  hint?: string;
  tone?: Tone;
  /** Para valores numéricos: decimales (coma es-CO) y sufijo, p. ej. 1 y "h". */
  decimals?: number;
  suffix?: string;
  /** Cuenta de 0 al valor al montar (600ms). Por defecto, sí con números. */
  animate?: boolean;
  className?: string;
}

const NORMAL: Record<Tone, "default" | "ok" | "risk" | "over" | "pending"> = {
  default: "default",
  green: "ok",
  ok: "ok",
  yellow: "risk",
  risk: "risk",
  red: "over",
  over: "over",
  violet: "pending",
  pending: "pending",
};

const TEXT = {
  default: "text-ink",
  ok: "text-ok",
  risk: "text-risk",
  over: "text-over",
  pending: "text-pending",
} as const;

const BAR = {
  default: "bg-brand-200 dark:bg-brand-300/40",
  ok: "bg-ok-solid",
  risk: "bg-risk-solid",
  over: "bg-over-solid",
  pending: "bg-pending-solid",
} as const;

/**
 * Cifra resumen en tarjeta.
 *
 *   <StatCard label="Personas con horas" value={12} hint="Filas del archivo" />
 *   <StatCard label="Horas extra válidas" value={38.5} decimals={1} suffix="h" />
 *   <StatCard label="Semanas por revisar" value={3} tone="pending" />
 *
 * Tonos: default | ok | risk | over | pending (alias heredados: green,
 * yellow, red, violet). Con tono, barra superior de 3px en el relleno del
 * estado, su forma junto a la etiqueta y la cifra en el texto AA del estado.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  decimals = 0,
  suffix = "",
  animate = true,
  className,
}: StatCardProps) {
  const t = NORMAL[tone];
  return (
    <div className={clsx("card relative flex flex-col overflow-hidden", className)}>
      <span aria-hidden className={clsx("print-exact absolute inset-x-0 top-0 h-[3px]", BAR[t])} />
      <p className="flex items-center gap-1.5 text-small leading-snug text-ink-2">
        {t === "ok" && <LevelIcon level="green" className="text-ok-solid" />}
        {t === "risk" && <LevelIcon level="yellow" className="text-risk-solid" />}
        {t === "over" && <LevelIcon level="red" className="text-over-solid" />}
        {t === "pending" && <PendingIcon className="text-pending" />}
        {label}
      </p>
      <p className={clsx("mt-1.5 text-display tabular-nums", TEXT[t])}>
        {typeof value === "number" && animate ? (
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        ) : typeof value === "number" ? (
          `${new Intl.NumberFormat("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)}${suffix}`
        ) : (
          value
        )}
      </p>
      {hint && <p className="mt-auto pt-1.5 text-caption font-normal text-muted">{hint}</p>}
    </div>
  );
}
