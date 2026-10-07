"use client";

import clsx from "clsx";
import { useDrawer, type Segment } from "./drawer/context";
import { PendingIcon } from "./StatusBadge";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { Icon, type IconName } from "./ui/Icon";

type Tone = "default" | "info" | "pending" | "risk" | "over" | "ok";
/** Alias heredados. */
type LegacyTone = "red" | "yellow" | "violet" | "green";

const NORMAL: Record<Tone | LegacyTone, Tone> = {
  default: "default",
  info: "info",
  pending: "pending",
  risk: "risk",
  over: "over",
  ok: "ok",
  red: "over",
  yellow: "risk",
  violet: "pending",
  green: "ok",
};

/** Cifra: texto AA del estado (el naranja ALIÓN nunca como texto). */
const VALUE: Record<Tone, string> = {
  default: "text-ink",
  info: "text-ink",
  pending: "text-pending",
  risk: "text-risk",
  over: "text-over",
  ok: "text-ok",
};
/** Barra superior y fondo del icono. */
const BAR: Record<Tone, string> = {
  default: "bg-primary",
  info: "bg-info-solid",
  pending: "bg-pending-solid",
  risk: "bg-risk-solid",
  over: "bg-over-solid",
  ok: "bg-ok-solid",
};
const ICON: Record<Tone, string> = {
  default: "bg-primary-soft text-link",
  info: "bg-info-soft text-info",
  pending: "bg-pending-soft text-pending",
  risk: "bg-risk-soft text-risk",
  over: "bg-over-soft text-over",
  ok: "bg-ok-soft text-ok",
};

/**
 * Indicador del panel. Al tocarlo se abre a la derecha la lista de personas
 * que lo componen.
 *
 *   <KpiCard label="Horas extra del mes" value={168} decimals={1} suffix="h"
 *            icon="clock" segment="all" />
 *
 * - Valores numéricos: cuentan hasta la cifra al montar y, al filtrar, desde
 *   la cifra anterior (AnimatedNumber; sin animación con movimiento reducido).
 * - Tono: barra superior de 3px, icono y cifra en el color AA del estado; con
 *   tono «pending» el icono es el reloj de «Por revisar».
 * - Hover: se eleva (card-interactive) y la flecha de «Ver lista» avanza.
 */
export function KpiCard({
  label,
  value,
  decimals = 0,
  suffix = "",
  hint,
  tone = "default",
  icon,
  segment,
  className,
}: {
  label: string;
  value: string | number;
  decimals?: number;
  suffix?: string;
  hint?: string;
  tone?: Tone | LegacyTone;
  icon?: IconName;
  segment: Segment;
  className?: string;
  /** Obsoleto: la entrada escalonada la hace el contenedor (.reveal-stagger). */
  delay?: number;
}) {
  const drawer = useDrawer();
  const t = NORMAL[tone];

  return (
    <button
      type="button"
      onClick={() => drawer?.open({ kind: "segment", segment })}
      className={clsx(
        "card card-interactive group relative flex min-w-0 flex-col overflow-hidden text-left",
        className
      )}
    >
      <span aria-hidden className={clsx("print-exact absolute inset-x-0 top-0 h-[3px]", BAR[t])} />
      <span className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={clsx(
            "print-exact flex h-8 w-8 shrink-0 items-center justify-center rounded-control",
            ICON[t]
          )}
        >
          {t === "pending" ? (
            <PendingIcon className="h-4 w-4" />
          ) : (
            <Icon name={icon ?? "dashboard"} className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 pt-1 text-small font-medium leading-snug text-ink-2">{label}</span>
      </span>
      <span className={clsx("mt-2 text-display tabular-nums", VALUE[t])}>
        {typeof value === "number" ? (
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        ) : (
          value
        )}
      </span>
      {hint && <span className="pt-1 text-caption font-normal text-muted">{hint}</span>}
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-caption font-semibold text-link print:hidden">
        Ver lista
        <Icon
          name="arrow-right"
          className="h-3.5 w-3.5 transition-transform duration-fast ease-enter group-hover:translate-x-0.5 group-active:translate-x-1"
        />
      </span>
    </button>
  );
}
